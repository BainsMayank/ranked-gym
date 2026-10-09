import { sessionSeconds, type BuildContext, type Finisher, type TemplateBuild } from './build';
import { contribution, emptyVolume, type GroupTarget, type VolumeMap } from './volume';
import type { GroupRole, SlotRole, VolumeGroup } from './types';

/**
 * Fits each session to the time budget while steering weekly volume towards its targets.
 *
 * 1. Required slots (skills, main and secondary lifts) go in first, round-robin across sessions so
 *    every session gets its main lifts before any gets extras: 3 sets (2 if 3 don't fit).
 * 2. Then, greedily, the move that closes the most weighted volume gap (gaps below a group's
 *    floor first): one more set on an exercise already in (worth less the more sets it has), or
 *    an accessory with 2 sets.
 * 3. A move is only taken when the session still fits its time and no group goes over its weekly
 *    ceiling. Time wins: a group can end below its floor, never above its ceiling.
 */

const ROLE_WEIGHT: Record<GroupRole, number> = { focus: 1.6, normal: 1, maintain: 0.8, minor: 0.5 };
const EPS = 1e-6;
const FLOOR_WEIGHT = 3;

export interface FitOptions {
  targets: Record<VolumeGroup, GroupTarget>;
  budgetSec: number;
  finisher: Finisher | null;
  ctx: BuildContext;
}

export function weeklyVolume(builds: readonly TemplateBuild[]): VolumeMap {
  const v = emptyVolume();
  for (const b of builds) {
    for (const e of b.entries) {
      if (e.sets === 0) continue;
      for (const [g, w] of contribution(e.exercise)) v[g] += w * e.sets * b.count;
    }
  }
  return v;
}

export function fitWeek(builds: TemplateBuild[], opts: FitOptions): void {
  const { targets, budgetSec, finisher, ctx } = opts;
  const caps = ctx.profile.caps;
  const volume = weeklyVolume(builds);
  const fits = (b: TemplateBuild) => sessionSeconds(b.entries, finisher, ctx) <= budgetSec;

  /** Would `sets` more of this entry keep every group under its weekly ceiling? */
  const underCeiling = (b: TemplateBuild, i: number, sets: number) => {
    for (const [g, w] of contribution(b.entries[i]!.exercise)) {
      if (volume[g] + w * sets * b.count > targets[g].max + EPS) return false;
    }
    return true;
  };
  /** Adds the sets if the session still fits its time; returns whether it did. */
  const apply = (b: TemplateBuild, i: number, sets: number) => {
    const entry = b.entries[i]!;
    entry.sets += sets;
    if (!fits(b)) {
      entry.sets -= sets;
      return false;
    }
    for (const [g, w] of contribution(entry.exercise)) volume[g] += w * sets * b.count;
    return true;
  };

  // 1. Required slots, round-robin by slot position.
  const longest = Math.max(0, ...builds.map((b) => b.entries.length));
  for (let pos = 0; pos < longest; pos++) {
    for (const b of builds) {
      const entry = b.entries[pos];
      if (!entry || (entry.slot.role === 'accessory' && !entry.slot.required)) continue;
      const tries = entry.slot.role === 'accessory' ? [2] : [3, 2];
      const added = tries.some((n) => underCeiling(b, pos, n) && apply(b, pos, n));
      if (!added && underCeiling(b, pos, 2)) b.timeLimited = true;
    }
  }

  // 2. Greedy fill.
  const blocked = new Set<string>();
  for (let guard = 0; guard < 400; guard++) {
    const moves: { b: TemplateBuild; i: number; sets: number; score: number; key: string }[] = [];
    builds.forEach((b, bi) =>
      b.entries.forEach((entry, i) => {
        const key = `${bi}:${i}`;
        if (blocked.has(key)) return;
        const role: SlotRole = entry.slot.role;
        const adding = entry.sets === 0 ? (role === 'accessory' ? 2 : 0) : 1;
        if (adding === 0 || entry.sets + adding > caps[role]) return;
        if (!underCeiling(b, i, adding)) return;
        let gain = 0;
        for (const [g, w] of contribution(entry.exercise)) {
          // Sets that lift a group towards its floor count three times as much as sets towards
          // its target, so every group reaches its floor before any chases the top of its range.
          const amount = w * adding * b.count;
          const toFloor = Math.min(amount, Math.max(0, targets[g].floor - volume[g]));
          const toTarget = Math.min(
            amount - toFloor,
            Math.max(0, targets[g].target - volume[g] - toFloor),
          );
          gain += ROLE_WEIGHT[targets[g].role] * (toFloor * FLOOR_WEIGHT + toTarget);
        }
        if (role === 'accessory') gain *= ctx.profile.accessoryWeight;
        // Per set, with diminishing returns for an exercise that already has plenty.
        const score =
          entry.sets === 0
            ? (gain / adding) * 1.05
            : gain * (1 - 0.15 * Math.max(0, entry.sets - 2));
        if (score > EPS) moves.push({ b, i, sets: adding, score, key });
      }),
    );
    if (moves.length === 0) break;
    moves.sort((x, y) => y.score - x.score);
    let took = false;
    for (const m of moves) {
      if (apply(m.b, m.i, m.sets)) {
        took = true;
        break;
      }
      // Time only goes up, so a move that doesn't fit now never will.
      blocked.add(m.key);
      m.b.timeLimited = true;
    }
    if (!took) break;
  }
}

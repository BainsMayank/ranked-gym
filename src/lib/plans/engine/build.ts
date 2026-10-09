import { defaultWeightMode } from '@/lib/routines/defaults';
import { estimateDurationSec } from '@/lib/routines/duration';
import type { EffortMetric } from '@/lib/routines/taxonomy';
import type { RoutineExercise, RoutineSet } from '@/lib/routines/types';

import type { GoalProfile, Prescription } from './profiles';
import { progressionFor } from './progression';
import type { SessionTemplate, Slot } from './splits';
import type { PlanExercise, PlanLevel, SlotRole } from './types';

/**
 * Turns picked exercises into routine exercises (sets, reps, rest, effort, warm-ups, supersets and
 * the cardio finisher). The fitter (fit.ts) decides how many working sets each one gets.
 */

export interface Entry {
  slot: Slot;
  exercise: PlanExercise;
  /** Working sets; 0 = not in the session. */
  sets: number;
}

export interface Finisher {
  exercise: PlanExercise;
  minutes: number;
}

export interface BuildContext {
  profile: GoalProfile;
  level: PlanLevel;
  effort: EffortMetric;
  newId: () => string;
}

const ROLE_RANK: Record<SlotRole, number> = { skill: 0, main: 1, secondary: 2, accessory: 3 };

/** Skills first, then compound lifts, then isolation work; slot order within each. */
export function orderEntries(entries: readonly Entry[]): Entry[] {
  const rank = (e: Entry) =>
    e.slot.role === 'skill' ? 0 : e.exercise.mechanic === 'compound' ? 1 : 2;
  return entries
    .map((e, i) => ({ e, i }))
    .sort(
      (a, b) =>
        rank(a.e) - rank(b.e) || ROLE_RANK[a.e.slot.role] - ROLE_RANK[b.e.slot.role] || a.i - b.i,
    )
    .map((x) => x.e);
}

function effortFields(rir: number | null, effort: EffortMetric) {
  if (rir === null) return { rir: null, rpe: null };
  return {
    rir: effort === 'rpe' ? null : Math.min(5, Math.max(0, rir)),
    rpe: effort === 'rir' ? null : Math.min(10, Math.max(5, 10 - rir)),
  };
}

function baseSet(exercise: PlanExercise, id: string): RoutineSet {
  return {
    id,
    setType: 'working',
    targetType: 'rep_range',
    reps: null,
    repsMin: null,
    repsMax: null,
    durationSec: null,
    distanceM: null,
    weightKg: null,
    weightMode: defaultWeightMode(exercise.logType),
    weightPercent: null,
    rir: null,
    rpe: null,
    tempo: null,
  };
}

function prescriptionFor(role: SlotRole, profile: GoalProfile): Prescription {
  if (role === 'skill') {
    const { repsMin, repsMax, restSec } = profile.skill;
    return { repsMin, repsMax, restSec: restSec + 60, rir: 2, structure: 'straight' };
  }
  return profile[role];
}

/** Hold length for timed moves that aren't skills (planks, hollow holds). */
const HOLD_SEC: Record<PlanLevel, number> = { beginner: 30, intermediate: 40, advanced: 45 };

export function restFor(entry: Entry, profile: GoalProfile, firstMain: boolean): number {
  if (entry.exercise.logType === 'duration') {
    return entry.slot.role === 'skill' ? profile.skill.restSec : 60;
  }
  if (entry.slot.role === 'main' && !firstMain && profile.main.structure === 'top_backoff') {
    return profile.secondary.restSec;
  }
  return prescriptionFor(entry.slot.role, profile).restSec;
}

export function buildSets(
  entry: Entry,
  ctx: BuildContext,
  opts: { warmups: boolean; firstMain: boolean },
): RoutineSet[] {
  const { exercise, sets: n, slot } = entry;
  const make = () => baseSet(exercise, ctx.newId());
  const out: RoutineSet[] = [];

  if (exercise.logType === 'duration') {
    const sec = slot.role === 'skill' ? ctx.profile.skill.holdSec : HOLD_SEC[ctx.level];
    for (let i = 0; i < n; i++) out.push({ ...make(), targetType: 'duration', durationSec: sec });
    return out;
  }

  const weighted = exercise.logType === 'weight_reps';
  // Only the session's first main lift gets a top set; other main lifts work like secondary ones.
  const p =
    slot.role === 'main' && !opts.firstMain && ctx.profile.main.structure === 'top_backoff'
      ? ctx.profile.secondary
      : prescriptionFor(slot.role, ctx.profile);
  if (opts.warmups && weighted) {
    for (const reps of [8, 4]) {
      out.push({ ...make(), setType: 'warmup', targetType: 'reps', reps, weightMode: 'absolute' });
    }
  }
  const range = (min: number, max: number) =>
    min < max
      ? { targetType: 'rep_range' as const, repsMin: min, repsMax: max }
      : { targetType: 'reps' as const, reps: min };

  if (weighted && p.structure === 'top_backoff' && p.backoff) {
    out.push({
      ...make(),
      setType: 'top',
      ...range(p.repsMin, p.repsMax),
      ...effortFields(p.rir, ctx.effort),
    });
    for (let i = 1; i < n; i++) {
      out.push({
        ...make(),
        setType: 'backoff',
        ...range(p.backoff.repsMin, p.backoff.repsMax),
        weightMode: 'percent_of_top_set',
        weightPercent: 90,
        ...effortFields(p.backoff.rir, ctx.effort),
      });
    }
    return out;
  }

  // Fixed reps (3×5) only make sense with a load; bodyweight work gets a range instead.
  const [min, max] =
    p.structure === 'fixed' && !weighted ? [p.repsMin, p.repsMin + 3] : [p.repsMin, p.repsMax];
  for (let i = 0; i < n; i++) {
    const failure = p.lastSetFailure && i === n - 1 && n > 1 && exercise.mechanic === 'isolation';
    out.push({
      ...make(),
      setType: failure ? 'failure' : 'working',
      ...range(min, max),
      ...effortFields(failure ? 0 : p.rir, ctx.effort),
    });
  }
  return out;
}

/** Ordered routine exercises for a session (working sets from the entries). */
export function buildSession(
  entries: readonly Entry[],
  finisher: Finisher | null,
  ctx: BuildContext,
): RoutineExercise[] {
  const ordered = orderEntries(entries.filter((e) => e.sets > 0));
  const firstMain = ordered.find(
    (e) => e.slot.role === 'main' && e.exercise.logType === 'weight_reps',
  );
  const built: RoutineExercise[] = ordered.map((e) => {
    const sets = buildSets(e, ctx, {
      warmups: ctx.profile.warmups && e === firstMain,
      firstMain: e === firstMain,
    });
    return {
      id: ctx.newId(),
      exerciseId: e.exercise.id,
      supersetGroup: null,
      restSeconds: restFor(e, ctx.profile, e === firstMain),
      restAfterSupersetSeconds: null,
      notes: null,
      progressionRule: progressionFor(e, ctx.level, sets),
      sets,
    };
  });

  if (ctx.profile.supersets) {
    // Pair neighbouring accessories: no rest between the two, then one round rest.
    let group = 1;
    const roundRest = Math.round((ctx.profile.accessory.restSec * 1.5) / 15) * 15;
    for (let i = 0; i + 1 < ordered.length; i++) {
      if (ordered[i]!.slot.role !== 'accessory' || ordered[i + 1]!.slot.role !== 'accessory')
        continue;
      for (const k of [i, i + 1]) {
        built[k] = {
          ...built[k]!,
          supersetGroup: group,
          restSeconds: 0,
          restAfterSupersetSeconds: roundRest,
        };
      }
      group += 1;
      i += 1;
    }
  }

  if (finisher) {
    built.push({
      id: ctx.newId(),
      exerciseId: finisher.exercise.id,
      supersetGroup: null,
      restSeconds: 0,
      restAfterSupersetSeconds: null,
      notes: 'Easy to moderate pace: you should be able to talk.',
      progressionRule: { v: 1, kind: 'none' },
      sets: [
        {
          ...baseSet(finisher.exercise, ctx.newId()),
          targetType: 'duration',
          durationSec: finisher.minutes * 60,
        },
      ],
    });
  }
  return built;
}

const noId = () => '';

/** Estimated seconds for a session as it would be built. */
export function sessionSeconds(
  entries: readonly Entry[],
  finisher: Finisher | null,
  ctx: BuildContext,
): number {
  return estimateDurationSec(buildSession(entries, finisher, { ...ctx, newId: noId }));
}

export interface TemplateBuild {
  template: SessionTemplate;
  /** How many times a week it runs. */
  count: number;
  entries: Entry[];
  /** Slots nothing could fill (equipment, bars, avoid list). */
  empty: Slot[];
  /** Something useful didn't fit the time budget. */
  timeLimited: boolean;
}

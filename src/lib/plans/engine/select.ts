import { TECHNICAL_SLUGS } from '@/lib/workouts/generator/generate';
import { movementPattern, type MovementPattern } from '@/lib/workouts/generator/patterns';
import { createRng } from '@/lib/workouts/generator/random';

import { BEGINNER_LAST, LADDERS, NEEDS_BARS, NEEDS_GYM, OPTIONS } from './catalog';
import { availableEquipment, hasBars } from './input';
import { FAMILY_MUSCLES, type SessionTemplate, type Slot } from './splits';
import type { PlanExercise, PlanInput, PlanLevel, TemplateFamily } from './types';

/**
 * Exercise selection. An exercise can go in a session when the lifter has the kit (and bars when
 * it needs them), hasn't asked to avoid it, and all its primary muscles belong to the session's
 * family. Slots take their curated choices in order; beginners see harder moves last. A slot
 * prefers an exercise the week doesn't use yet (so A and B days differ), except main lifts, which
 * may repeat on purpose (squatting twice a week is the point).
 */

export interface SelectionRules {
  input: Pick<PlanInput, 'equipment' | 'avoid' | 'level'>;
  bySlug: ReadonlyMap<string, PlanExercise>;
  library: readonly PlanExercise[];
}

export function usable(e: PlanExercise, rules: SelectionRules): boolean {
  const { equipment, avoid } = rules.input;
  if (e.createdBy !== null) return false;
  if (e.category !== 'strength' && e.category !== 'calisthenics') return false;
  if (!availableEquipment(equipment).has(e.equipment)) return false;
  if (NEEDS_BARS.has(e.slug) && !hasBars(equipment)) return false;
  if (NEEDS_GYM.has(e.slug) && !availableEquipment(equipment).has('machine')) return false;
  return !avoid.includes(e.id);
}

/** All primary muscles inside the family's muscles. */
export function fitsFamily(e: Pick<PlanExercise, 'muscles'>, family: TemplateFamily): boolean {
  const own = FAMILY_MUSCLES[family];
  return e.muscles.every((m) => m.role !== 'primary' || own.has(m.muscle));
}

function ladderOrder(slugs: readonly string[], level: PlanLevel): string[] {
  const i = level === 'beginner' ? 0 : level === 'intermediate' ? 1 : 2;
  // The level's rung, then easier rungs, then harder ones.
  return [...new Set([slugs[i]!, ...slugs.slice(0, i).reverse(), ...slugs.slice(i + 1)])];
}

/** Slugs in preference order for a slot. */
export function slotPreference(slot: Slot, level: PlanLevel): string[] {
  if (slot.ladder) return ladderOrder(LADDERS[slot.ladder], level);
  const list: string[] = slot.options ? [...OPTIONS[slot.options]] : [];
  if (level !== 'beginner') return list;
  return [
    ...list.filter((x) => !BEGINNER_LAST.has(x)),
    ...list.filter((x) => BEGINNER_LAST.has(x)),
  ];
}

/** 2 = the slot's pattern, 1 = its muscle as a primary mover, 0 = no match. */
function fallbackMatch(e: PlanExercise, slot: Slot): number {
  if (slot.pattern && movementPattern(e) === slot.pattern) return 2;
  if (slot.muscle && e.muscles.some((m) => m.role === 'primary' && m.muscle === slot.muscle))
    return 1;
  return 0;
}

/** Library search when no curated choice fits: ranked lifts and free weights first. */
function fallbackCandidates(slot: Slot, family: TemplateFamily, rules: SelectionRules) {
  const compound = slot.role !== 'accessory';
  return rules.library
    .filter(
      (e) =>
        usable(e, rules) &&
        fitsFamily(e, family) &&
        !TECHNICAL_SLUGS.has(e.slug) &&
        e.logType !== 'distance_duration' &&
        (!compound || e.mechanic === 'compound') &&
        fallbackMatch(e, slot) > 0,
    )
    .sort(
      (a, b) =>
        fallbackMatch(b, slot) - fallbackMatch(a, slot) ||
        Number(b.isRankable) - Number(a.isRankable) ||
        Number(['barbell', 'dumbbell'].includes(b.equipment)) -
          Number(['barbell', 'dumbbell'].includes(a.equipment)) ||
        a.slug.localeCompare(b.slug),
    );
}

/** Every exercise that could fill this slot, best first. */
export function slotCandidates(
  slot: Slot,
  family: TemplateFamily,
  rules: SelectionRules,
): PlanExercise[] {
  const curated = slotPreference(slot, rules.input.level)
    .map((slug) => rules.bySlug.get(slug))
    .filter((e): e is PlanExercise => !!e && usable(e, rules) && fitsFamily(e, family));
  const seen = new Set(curated.map((e) => e.id));
  const rest = fallbackCandidates(slot, family, rules).filter((e) => !seen.has(e.id));
  return [...curated, ...rest];
}

export interface PickContext {
  /** Exercise ids already in this session. */
  inSession: ReadonlySet<string>;
  /** Exercise ids already used elsewhere this week (non-main slots avoid them). */
  inWeek: ReadonlySet<string>;
  /** 0 = always the first choice; otherwise a seeded pick among the top three. */
  seed: number;
  salt: string;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function pickForSlot(
  slot: Slot,
  template: SessionTemplate,
  rules: SelectionRules,
  ctx: PickContext,
): PlanExercise | null {
  const all = slotCandidates(slot, template.family, rules).filter((e) => !ctx.inSession.has(e.id));
  if (all.length === 0) return null;
  const fresh =
    slot.role === 'main' || slot.role === 'skill' ? all : all.filter((e) => !ctx.inWeek.has(e.id));
  const pool = fresh.length ? fresh : all;
  if (ctx.seed === 0) return pool[0]!;
  const rng = createRng(ctx.seed ^ hash(ctx.salt));
  return pool[Math.floor(rng() * Math.min(3, pool.length))]!;
}

/** The pattern an exercise counts as for weekly coverage. */
export function coveragePattern(e: PlanExercise): MovementPattern | 'core' {
  const pattern = movementPattern(e);
  if (
    e.muscles.some((m) => m.role === 'primary' && (m.muscle === 'abs' || m.muscle === 'obliques'))
  ) {
    return 'core';
  }
  if (pattern === 'iso:glutes' || pattern === 'iso:hamstrings') return 'hinge';
  return pattern;
}

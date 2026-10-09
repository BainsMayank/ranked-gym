import type { RoutineExercise, RoutineSet } from '@/lib/routines/types';
import type { PreviousSet } from '@/lib/workouts/lastTime';

import type { Entry } from './build';
import { nextRung } from './catalog';
import type { PlanExercise, PlanLevel, ProgressionRule } from './types';

/**
 * Progression. Beginners add weight every session they hit all their reps (linear); everyone else
 * works up the rep range before adding weight (double progression). Bodyweight moves add reps,
 * then step up the progression ladder; holds add 5 seconds. The rule is stored on the routine
 * exercise and applied when a planned session starts, using what was logged last time.
 */

const STEP_KG: Record<PlanExercise['equipment'], number> = {
  barbell: 2.5,
  dumbbell: 2.5,
  kettlebell: 4,
  machine: 5,
  cable: 5,
  smith: 2.5,
  bodyweight: 2.5,
  band: 2.5,
  other: 2.5,
};

const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'adductors', 'lower_back']);

function isLowerBody(e: PlanExercise): boolean {
  return e.muscles.some((m) => m.role === 'primary' && LOWER.has(m.muscle));
}

/** Weight to add after a successful session: +5 kg for lower-body bar and machine work, else one step. */
export function incrementKg(e: PlanExercise): number {
  const step = STEP_KG[e.equipment];
  if (isLowerBody(e) && (e.equipment === 'barbell' || e.equipment === 'machine')) return 5;
  return step;
}

function firstWorking(sets: readonly RoutineSet[]): RoutineSet | undefined {
  return sets.find((s) => s.setType !== 'warmup');
}

export function progressionFor(
  entry: Pick<Entry, 'exercise' | 'slot'>,
  level: PlanLevel,
  sets: readonly RoutineSet[],
): ProgressionRule {
  const e = entry.exercise;
  const first = firstWorking(sets);
  if (!first) return { v: 1, kind: 'none' };
  if (first.targetType === 'duration') {
    return {
      v: 1,
      kind: 'hold',
      targetSec: first.durationSec ?? 20,
      addSec: 5,
      maxSec: entry.slot.role === 'skill' ? 60 : 90,
      nextSlug: nextRung(e.slug),
    };
  }
  const repsMin = first.reps ?? first.repsMin ?? 8;
  const repsMax = first.reps ?? first.repsMax ?? repsMin;
  if (e.logType !== 'weight_reps') {
    return { v: 1, kind: 'reps', repsMin, repsMax, nextSlug: nextRung(e.slug) };
  }
  const stepKg = STEP_KG[e.equipment];
  if (level === 'beginner') {
    return { v: 1, kind: 'linear', reps: repsMin, incrementKg: incrementKg(e), stepKg };
  }
  return { v: 1, kind: 'double', repsMin, repsMax, incrementKg: incrementKg(e), stepKg };
}

/** Reads a stored rule (jsonb) back; anything unrecognised is treated as no rule. */
export function parseRule(value: unknown): ProgressionRule | null {
  if (!value || typeof value !== 'object') return null;
  const kind = (value as { kind?: unknown }).kind;
  if (
    kind === 'linear' ||
    kind === 'double' ||
    kind === 'reps' ||
    kind === 'hold' ||
    kind === 'none'
  ) {
    return value as ProgressionRule;
  }
  return null;
}

const roundTo = (kg: number, step: number) => Number((Math.round(kg / step) * step).toFixed(2));

export interface StartContext {
  /** Plan week (1-based). */
  week: number;
  deload: boolean;
}

export interface Suggested {
  exercise: RoutineExercise;
  /** Shown on the exercise in the logger. */
  note: string | null;
}

/**
 * Targets for a planned session: in week 1 (or with nothing logged yet) weights stay blank with a
 * "find your working weight" hint; afterwards the next load, reps or hold comes from last time.
 */
export function suggestTargets(
  exercise: RoutineExercise,
  previous: readonly PreviousSet[],
  ctx: StartContext,
): Suggested {
  const rule = parseRule(exercise.progressionRule);
  const done = previous.filter((p) => p.setType !== 'warmup');
  if (!rule || rule.kind === 'none') return { exercise, note: null };

  if (rule.kind === 'linear' || rule.kind === 'double') {
    const last = Math.max(0, ...done.map((p) => p.weightKg ?? 0));
    if (ctx.week === 1 || done.length === 0 || last === 0) {
      return {
        exercise,
        note: 'Find your working weight: pick a load that leaves about 2 reps in reserve on every set.',
      };
    }
    let kg = last;
    let note: string;
    if (ctx.deload) {
      kg = roundTo(last * 0.9, rule.stepKg);
      note = 'Deload week: about 90% of last time, and stop well short of failure.';
    } else if (rule.kind === 'linear') {
      const allHit = done.every((p) => (p.reps ?? 0) >= rule.reps);
      kg = allHit ? last + rule.incrementKg : last;
      note = allHit
        ? `+${rule.incrementKg} kg: you got all your reps last time.`
        : 'Same weight as last time until you get every rep.';
    } else {
      const allTop = done.every((p) => (p.reps ?? 0) >= rule.repsMax);
      kg = allTop ? last + rule.incrementKg : last;
      note = allTop
        ? `+${rule.incrementKg} kg: you hit ${rule.repsMax} reps on every set. Start back at ${rule.repsMin}.`
        : `Same weight, aim for one more rep (up to ${rule.repsMax}).`;
    }
    const sets = exercise.sets.map((s) =>
      s.setType === 'warmup' || s.weightMode !== 'absolute' ? s : { ...s, weightKg: kg },
    );
    return { exercise: { ...exercise, sets }, note };
  }

  if (rule.kind === 'reps') {
    if (done.length === 0) return { exercise, note: null };
    const allTop = done.every((p) => (p.reps ?? 0) >= rule.repsMax);
    if (!allTop) return { exercise, note: `Aim for one more rep per set (up to ${rule.repsMax}).` };
    return {
      exercise,
      note: rule.nextSlug
        ? 'You hit the top of the range: ready for the next progression. Swap it in from your plan.'
        : 'You hit the top of the range: add a little weight or slow the lowering down.',
    };
  }

  // Holds.
  const best = Math.max(0, ...done.map((p) => p.durationSec ?? 0));
  if (done.length === 0 || best < rule.targetSec || ctx.deload) return { exercise, note: null };
  const sec = Math.min(rule.maxSec, best + rule.addSec);
  const sets = exercise.sets.map((s) =>
    s.targetType === 'duration' && s.setType !== 'warmup' ? { ...s, durationSec: sec } : s,
  );
  const note =
    sec >= rule.maxSec && rule.nextSlug
      ? 'You can hold the full time: ready for the next progression.'
      : `Hold ${sec} s this time.`;
  return { exercise: { ...exercise, sets }, note };
}

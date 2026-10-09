import type { Exercise } from '@/lib/exercises/types';
import {
  MUSCLES_BY_REGION,
  type Equipment,
  type Muscle,
  type MuscleRegion,
} from '@/lib/exercises/taxonomy';
import { defaultWeightMode } from '@/lib/routines/defaults';
import { estimateDurationMin, estimateDurationSec } from '@/lib/routines/duration';
import type { EffortMetric } from '@/lib/routines/taxonomy';
import type { RoutineExercise, RoutineSet } from '@/lib/routines/types';

import { isCompoundPattern, movementPattern, type MovementPattern } from './patterns';
import { createRng, type Rng } from './random';

/**
 * Random workout generator (pure; same options and seed give the same workout).
 *
 * 1. Targets: the chosen regions' muscles, or for "Surprise me" the split (push, pull, legs, full
 *    body) whose muscles you trained least recently.
 * 2. Picks greedily: each pick scores by how much still-untrained target muscle it covers, with a
 *    nudge towards compound lifts first, free weights and ranked lifts, a little randomness for
 *    variety, and no
 *    repeated movement pattern (relaxed to two of a pattern only when time is left over).
 * 3. Adds exercises while the estimated length (the routine builder's duration model) fits the
 *    time available, dropping a set from an exercise that would just overflow.
 * 4. Orders compound lifts before isolation work.
 */

export const sessionLengths = [20, 30, 45, 60, 90] as const;
export type SessionLength = (typeof sessionLengths)[number];

export const intensities = ['light', 'moderate', 'hard'] as const;
export type Intensity = (typeof intensities)[number];

export const intensityLabels: Record<Intensity, string> = {
  light: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
};

export type Focus = { kind: 'surprise' } | { kind: 'regions'; regions: MuscleRegion[] };

export interface GeneratorOptions {
  focus: Focus;
  minutes: SessionLength;
  /** What's available. Bodyweight work is always allowed. */
  equipment: Equipment[];
  intensity: Intensity;
  seed: number;
}

export type GenExercise = Pick<
  Exercise,
  | 'id'
  | 'slug'
  | 'name'
  | 'category'
  | 'equipment'
  | 'mechanic'
  | 'logType'
  | 'muscles'
  | 'createdBy'
  | 'isRankable'
>;

export interface GeneratorContext {
  library: readonly GenExercise[];
  /** Epoch ms each muscle was last trained (from history). */
  lastTrained?: ReadonlyMap<Muscle, number>;
  now: number;
  effort: EffortMetric;
  newId: () => string;
}

export type SplitKey = 'push' | 'pull' | 'legs' | 'full';

export interface GeneratedWorkout {
  name: string;
  split: SplitKey | null;
  targetMuscles: Muscle[];
  exercises: RoutineExercise[];
  estimatedMin: number;
}

export const SPLITS: Record<SplitKey, { name: string; muscles: Muscle[] }> = {
  push: {
    name: 'Push day',
    muscles: ['upper_chest', 'mid_lower_chest', 'front_delts', 'side_delts', 'triceps'],
  },
  pull: { name: 'Pull day', muscles: ['lats', 'upper_back', 'rear_delts', 'biceps'] },
  legs: { name: 'Leg day', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
  full: {
    name: 'Full body',
    muscles: [
      'quads',
      'hamstrings',
      'glutes',
      'mid_lower_chest',
      'lats',
      'upper_back',
      'front_delts',
    ],
  },
};

const REGION_NAMES: Record<MuscleRegion, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  arms: 'Arms',
  back: 'Back',
  core: 'Core',
  legs: 'Legs',
};

/** Technical, explosive or regression moves that don't belong in a random session. */
export const TECHNICAL_SLUGS: ReadonlySet<string> = new Set([
  'burpee',
  'box-jump',
  'jump-squat',
  'clap-push-up',
  'muscle-up',
  'ring-muscle-up',
  'archer-push-up',
  'archer-pull-up',
  'one-arm-push-up',
  'dragon-flag',
  'power-clean',
  'hang-clean',
  'power-snatch',
  'clean-and-jerk',
  'turkish-get-up',
  'wall-ball',
  'medicine-ball-slam',
  'knee-push-up',
  'wall-push-up',
  'incline-push-up',
  'negative-pull-up',
  'handstand-push-up',
  'pseudo-planche-push-up',
  'shrimp-squat',
  'pistol-squat',
  'l-sit-pull-up',
  'rack-pull',
]);

interface Prescription {
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
}

const PRESCRIPTIONS: Record<
  Intensity,
  { compound: Prescription; isolation: Prescription; rir: number; rpe: number }
> = {
  light: {
    compound: { sets: 2, repsMin: 10, repsMax: 12, restSec: 90 },
    isolation: { sets: 2, repsMin: 12, repsMax: 15, restSec: 60 },
    rir: 3,
    rpe: 7,
  },
  moderate: {
    compound: { sets: 3, repsMin: 6, repsMax: 10, restSec: 120 },
    isolation: { sets: 3, repsMin: 10, repsMax: 12, restSec: 75 },
    rir: 2,
    rpe: 8,
  },
  hard: {
    compound: { sets: 4, repsMin: 5, repsMax: 8, restSec: 150 },
    isolation: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
    rir: 1,
    rpe: 9,
  },
};

const DAY_MS = 86_400_000;
const FREE_WEIGHTS: readonly Equipment[] = ['barbell', 'dumbbell', 'kettlebell'];

/** Library entries the generator may use with this equipment. */
export function candidatesFor(library: readonly GenExercise[], equipment: readonly Equipment[]) {
  const allowed = new Set<Equipment>([...equipment, 'bodyweight']);
  return library.filter(
    (e) =>
      e.createdBy === null &&
      (e.category === 'strength' || e.category === 'calisthenics') &&
      e.logType !== 'duration' &&
      e.logType !== 'distance_duration' &&
      allowed.has(e.equipment) &&
      !TECHNICAL_SLUGS.has(e.slug),
  );
}

/** Surprise me: the split whose muscles are most rested; full body with no history. */
export function pickSplit(
  lastTrained: ReadonlyMap<Muscle, number> | undefined,
  now: number,
  rng: Rng,
): SplitKey {
  if (!lastTrained || lastTrained.size === 0) return 'full';
  const restedDays = (muscles: Muscle[]) =>
    muscles.reduce((sum, m) => {
      const at = lastTrained.get(m);
      return sum + (at === undefined ? 7 : Math.min(7, (now - at) / DAY_MS));
    }, 0) / muscles.length;
  const scores = (['push', 'pull', 'legs'] as const).map((k) => ({
    k,
    s: restedDays(SPLITS[k].muscles) + rng() * 0.01,
  }));
  // Everything well rested (a break, or a new user): a full-body session.
  if (scores.every((x) => x.s >= 4)) return 'full';
  return scores.sort((a, b) => b.s - a.s)[0]!.k;
}

function regionName(regions: readonly MuscleRegion[]): string {
  if (regions.length === 0 || regions.length === 6) return 'Full body';
  const names = regions.map((r, i) => (i === 0 ? REGION_NAMES[r] : REGION_NAMES[r].toLowerCase()));
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function buildSets(
  exercise: GenExercise,
  p: Prescription,
  sets: number,
  options: GeneratorOptions,
  ctx: GeneratorContext,
): RoutineSet[] {
  const { rir, rpe } = PRESCRIPTIONS[options.intensity];
  return Array.from({ length: sets }, () => ({
    id: ctx.newId(),
    setType: 'working',
    targetType: 'rep_range',
    reps: null,
    repsMin: p.repsMin,
    repsMax: p.repsMax,
    durationSec: null,
    distanceM: null,
    weightKg: null,
    weightMode: defaultWeightMode(exercise.logType),
    weightPercent: null,
    rir: ctx.effort === 'rpe' ? null : rir,
    rpe: ctx.effort === 'rir' ? null : rpe,
    tempo: null,
  }));
}

function buildExercise(
  exercise: GenExercise,
  sets: number,
  options: GeneratorOptions,
  ctx: GeneratorContext,
): RoutineExercise {
  const plan = PRESCRIPTIONS[options.intensity];
  const p = exercise.mechanic === 'compound' ? plan.compound : plan.isolation;
  return {
    id: ctx.newId(),
    exerciseId: exercise.id,
    supersetGroup: null,
    restSeconds: p.restSec,
    restAfterSupersetSeconds: null,
    notes: null,
    progressionRule: null,
    sets: buildSets(exercise, p, sets, options, ctx),
  };
}

function setsFor(exercise: GenExercise, intensity: Intensity): number {
  const plan = PRESCRIPTIONS[intensity];
  return exercise.mechanic === 'compound' ? plan.compound.sets : plan.isolation.sets;
}

export function targetMusclesFor(
  options: GeneratorOptions,
  ctx: Pick<GeneratorContext, 'lastTrained' | 'now'>,
  rng: Rng,
): { muscles: Muscle[]; split: SplitKey | null; name: string } {
  if (options.focus.kind === 'surprise') {
    const split = pickSplit(ctx.lastTrained, ctx.now, rng);
    return { muscles: SPLITS[split].muscles, split, name: SPLITS[split].name };
  }
  const regions = options.focus.regions;
  const muscles = (
    regions.length ? regions : (Object.keys(MUSCLES_BY_REGION) as MuscleRegion[])
  ).flatMap((r) => [...MUSCLES_BY_REGION[r]]);
  return { muscles, split: null, name: regionName(regions) };
}

export function generateWorkout(
  options: GeneratorOptions,
  ctx: GeneratorContext,
): GeneratedWorkout {
  const rng = createRng(options.seed);
  const target = targetMusclesFor(options, ctx, rng);
  const targets = new Set(target.muscles);
  const need = new Map<Muscle, number>(target.muscles.map((m) => [m, 1]));
  const pool = candidatesFor(ctx.library, options.equipment).map((e) => ({
    e,
    pattern: movementPattern(e),
    jitter: rng() * 0.4,
  }));
  const budgetSec = options.minutes * 60;

  const picked: { e: GenExercise; pattern: MovementPattern; built: RoutineExercise }[] = [];
  const patternCount = new Map<MovementPattern, number>();
  let patternLimit = 1;
  let stage = 0;

  const score = (c: (typeof pool)[number]): number => {
    let s = 0;
    for (const m of c.e.muscles) {
      if (m.role === 'stabiliser') continue;
      s += m.weight * (need.get(m.muscle) ?? 0);
      if (m.role === 'primary' && !targets.has(m.muscle)) s -= 0.4;
    }
    if (s <= 0.05) return 0;
    const compounds = picked.filter((p) => isCompoundPattern(p.pattern)).length;
    if (c.e.mechanic === 'compound' && compounds < 2) s += 0.6;
    if (c.e.mechanic === 'isolation' && compounds === 0) s -= 0.5;
    if (FREE_WEIGHTS.includes(c.e.equipment)) s += 0.15;
    // Ranked lifts are the classics (and they move your rank).
    if (c.e.isRankable) s += 0.25;
    return s + c.jitter;
  };

  type Pick = (typeof picked)[number];
  // Compounds first; the time check uses this same order (the last exercise's rest isn't counted).
  const ordered = (extra?: Pick) => {
    const all = extra ? [...picked, extra] : picked;
    const compounds = all.filter((p) => isCompoundPattern(p.pattern));
    const isolation = all.filter((p) => !isCompoundPattern(p.pattern));
    return [...compounds, ...isolation].map((p) => p.built);
  };

  for (;;) {
    const ranked = pool
      .filter((c) => !picked.some((p) => p.e.id === c.e.id))
      .filter((c) => (patternCount.get(c.pattern) ?? 0) < patternLimit)
      .map((c) => ({ c, s: score(c) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    if (ranked.length === 0) {
      if (picked.length === 0 || stage === 2) break;
      // Time left over: first let the target muscles take a second helping with new patterns,
      // then (only if that runs dry) allow a second exercise of a pattern.
      stage += 1;
      if (stage === 1) for (const m of target.muscles) need.set(m, Math.max(need.get(m) ?? 0, 0.5));
      if (stage === 2) patternLimit = 2;
      continue;
    }

    let added = false;
    for (const { c } of ranked.slice(0, 6)) {
      const full = setsFor(c.e, options.intensity);
      for (let sets = full; sets >= 2 && !added; sets--) {
        const built = buildExercise(c.e, sets, options, ctx);
        const trial = ordered({ e: c.e, pattern: c.pattern, built });
        // Always allow one exercise, even in a very short session.
        if (picked.length === 0 || estimateDurationSec(trial) <= budgetSec) {
          picked.push({ e: c.e, pattern: c.pattern, built });
          patternCount.set(c.pattern, (patternCount.get(c.pattern) ?? 0) + 1);
          for (const m of c.e.muscles) {
            if (m.role === 'stabiliser' || !need.has(m.muscle)) continue;
            need.set(m.muscle, Math.max(0, need.get(m.muscle)! - m.weight * 0.8));
          }
          added = true;
        }
      }
      if (added) break;
    }
    if (!added) break;
  }

  const exercises = ordered();
  return {
    name: target.name,
    split: target.split,
    targetMuscles: target.muscles,
    exercises,
    estimatedMin: estimateDurationMin(exercises),
  };
}

/**
 * Swaps one exercise for another of the same movement pattern (else one that trains the same main
 * muscle), keeping its sets and place. Returns the workout unchanged when there's no alternative.
 */
export function rerollExercise(
  workout: GeneratedWorkout,
  index: number,
  options: GeneratorOptions,
  ctx: GeneratorContext,
  seed: number,
): GeneratedWorkout {
  const current = workout.exercises[index];
  const info = current && ctx.library.find((e) => e.id === current.exerciseId);
  if (!current || !info) return workout;
  const rng = createRng(seed);
  const used = new Set(workout.exercises.map((e) => e.exerciseId));
  const pattern = movementPattern(info);
  const mainMuscle = info.muscles.find((m) => m.role === 'primary')?.muscle;
  const pool = candidatesFor(ctx.library, options.equipment).filter((e) => !used.has(e.id));
  const samePattern = pool.filter((e) => movementPattern(e) === pattern);
  const sameMuscle = pool.filter((e) =>
    e.muscles.some((m) => m.role === 'primary' && m.muscle === mainMuscle),
  );
  const choices = samePattern.length ? samePattern : sameMuscle;
  if (choices.length === 0) return workout;
  const next = choices[Math.floor(rng() * choices.length)]!;
  const swapped: RoutineExercise = {
    ...buildExercise(next, current.sets.length, options, ctx),
    restSeconds: current.restSeconds,
  };
  const exercises = workout.exercises.map((e, i) => (i === index ? swapped : e));
  return { ...workout, exercises, estimatedMin: estimateDurationMin(exercises) };
}

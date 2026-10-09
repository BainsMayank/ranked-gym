import type { Exercise } from '@/lib/exercises/types';

import { defaultRestSec, newSet } from './defaults';
import { normaliseSupersets } from './setRules';
import type { RoutineColour, SetType } from './taxonomy';
import type { RoutineDoc, RoutineExercise, RoutineSet } from './types';
import { estimateDurationMin } from './duration';

/**
 * Starter routines, bundled with the app (they work offline from the first launch). Exercises are
 * referenced by their official slug; a test checks every slug exists in supabase/seed and that the
 * targets suit the exercise's log type. Weights are left empty: they're personal.
 */

type Reps = number | readonly [number, number];

interface TemplateSet {
  type?: SetType;
  reps?: Reps;
  sec?: number;
  rir?: number;
}

export interface TemplateExercise {
  slug: string;
  sets: readonly TemplateSet[];
  rest?: number;
  /** Same number = same superset (must sit next to each other). */
  superset?: number;
  roundRest?: number;
  notes?: string;
}

export interface RoutineTemplate {
  slug: string;
  name: string;
  description: string;
  colour: RoutineColour;
  exercises: readonly TemplateExercise[];
}

/** `count` identical sets. */
function x(count: number, set: TemplateSet): TemplateSet[] {
  return Array.from({ length: count }, () => set);
}

const range = (lo: number, hi: number) => [lo, hi] as const;

export const routineTemplates: readonly RoutineTemplate[] = [
  {
    slug: 'full-body-a',
    name: 'Full body A',
    description: 'Squat, bench and row. Three days a week with Full body B.',
    colour: 'iron',
    exercises: [
      { slug: 'barbell-back-squat', sets: x(3, { reps: range(5, 8), rir: 2 }), rest: 180 },
      { slug: 'barbell-bench-press', sets: x(3, { reps: range(5, 8), rir: 2 }), rest: 180 },
      { slug: 'barbell-bent-over-row', sets: x(3, { reps: range(8, 10), rir: 2 }), rest: 120 },
      { slug: 'dumbbell-lateral-raise', sets: x(2, { reps: range(12, 15), rir: 1 }), rest: 60 },
      { slug: 'plank', sets: x(2, { sec: 45 }), rest: 60 },
    ],
  },
  {
    slug: 'full-body-b',
    name: 'Full body B',
    description: 'Deadlift, overhead press and pull-ups.',
    colour: 'bronze',
    exercises: [
      { slug: 'barbell-deadlift', sets: x(3, { reps: 5, rir: 2 }), rest: 180 },
      { slug: 'barbell-overhead-press', sets: x(3, { reps: range(6, 8), rir: 2 }), rest: 150 },
      { slug: 'lat-pulldown', sets: x(3, { reps: range(8, 12), rir: 2 }), rest: 120 },
      { slug: 'goblet-squat', sets: x(2, { reps: range(10, 12), rir: 2 }), rest: 90 },
      { slug: 'hanging-knee-raise', sets: x(2, { reps: range(10, 15), rir: 2 }), rest: 60 },
    ],
  },
  {
    slug: 'push',
    name: 'Push',
    description: 'Chest, shoulders and triceps, with a top set on bench.',
    colour: 'champion',
    exercises: [
      {
        slug: 'barbell-bench-press',
        sets: [
          { type: 'top', reps: 5, rir: 1 },
          ...x(3, { type: 'backoff', reps: range(8, 10), rir: 2 }),
        ],
        rest: 180,
      },
      { slug: 'incline-dumbbell-press', sets: x(3, { reps: range(8, 12), rir: 2 }), rest: 120 },
      { slug: 'dumbbell-shoulder-press', sets: x(3, { reps: range(8, 12), rir: 2 }), rest: 120 },
      {
        slug: 'dumbbell-lateral-raise',
        sets: x(3, { reps: range(12, 15), rir: 1 }),
        rest: 0,
        superset: 1,
        roundRest: 75,
      },
      {
        slug: 'cable-rope-pushdown',
        sets: x(3, { reps: range(10, 12), rir: 1 }),
        rest: 0,
        superset: 1,
        roundRest: 75,
      },
    ],
  },
  {
    slug: 'pull',
    name: 'Pull',
    description: 'Back and biceps: vertical and horizontal pulls.',
    colour: 'diamond',
    exercises: [
      { slug: 'pull-up', sets: x(3, { reps: range(5, 8), rir: 2 }), rest: 150 },
      { slug: 'barbell-bent-over-row', sets: x(3, { reps: range(8, 10), rir: 2 }), rest: 120 },
      { slug: 'seated-cable-row', sets: x(3, { reps: range(10, 12), rir: 2 }), rest: 90 },
      { slug: 'cable-face-pull', sets: x(3, { reps: range(12, 15), rir: 2 }), rest: 60 },
      { slug: 'ez-bar-curl', sets: x(3, { reps: range(8, 12), rir: 1 }), rest: 75 },
    ],
  },
  {
    slug: 'legs',
    name: 'Legs',
    description: 'Squat top set and back-offs, RDLs, then a leg extension + curl superset.',
    colour: 'gold',
    exercises: [
      {
        slug: 'barbell-back-squat',
        sets: [
          { type: 'top', reps: range(4, 6), rir: 1 },
          ...x(2, { type: 'backoff', reps: range(6, 8), rir: 2 }),
        ],
        rest: 180,
        notes: 'Generate warm-ups once you set the top-set weight.',
      },
      { slug: 'barbell-romanian-deadlift', sets: x(3, { reps: range(8, 10), rir: 2 }), rest: 150 },
      {
        slug: 'leg-extension',
        sets: x(3, { reps: range(10, 12), rir: 1 }),
        rest: 0,
        superset: 1,
        roundRest: 90,
      },
      {
        slug: 'lying-leg-curl',
        sets: x(3, { reps: range(10, 12), rir: 1 }),
        rest: 0,
        superset: 1,
        roundRest: 90,
      },
      { slug: 'standing-calf-raise', sets: x(3, { reps: range(10, 15), rir: 1 }), rest: 60 },
    ],
  },
  {
    slug: 'upper',
    name: 'Upper',
    description: 'Bench, row, press and pull in one session.',
    colour: 'platinum',
    exercises: [
      { slug: 'barbell-bench-press', sets: x(3, { reps: range(6, 8), rir: 2 }), rest: 180 },
      { slug: 'one-arm-dumbbell-row', sets: x(3, { reps: range(8, 12), rir: 2 }), rest: 90 },
      { slug: 'dumbbell-shoulder-press', sets: x(3, { reps: range(8, 10), rir: 2 }), rest: 120 },
      { slug: 'lat-pulldown', sets: x(3, { reps: range(10, 12), rir: 2 }), rest: 90 },
      {
        slug: 'dumbbell-curl',
        sets: x(2, { reps: range(10, 12), rir: 1 }),
        rest: 0,
        superset: 1,
        roundRest: 60,
      },
      {
        slug: 'cable-triceps-pushdown',
        sets: x(2, { reps: range(10, 12), rir: 1 }),
        rest: 0,
        superset: 1,
        roundRest: 60,
      },
    ],
  },
  {
    slug: 'lower',
    name: 'Lower',
    description: 'Squat, hinge, single-leg work and calves.',
    colour: 'silver',
    exercises: [
      { slug: 'barbell-back-squat', sets: x(3, { reps: range(5, 8), rir: 2 }), rest: 180 },
      { slug: 'barbell-romanian-deadlift', sets: x(3, { reps: range(8, 10), rir: 2 }), rest: 150 },
      {
        slug: 'dumbbell-bulgarian-split-squat',
        sets: x(2, { reps: range(8, 12), rir: 2 }),
        rest: 90,
      },
      { slug: 'seated-leg-curl', sets: x(3, { reps: range(10, 12), rir: 1 }), rest: 75 },
      { slug: 'standing-calf-raise', sets: x(3, { reps: range(10, 15), rir: 1 }), rest: 60 },
    ],
  },
  {
    slug: 'beginner-calisthenics',
    name: 'Beginner calisthenics',
    description: 'No equipment but a bar. Push-ups, rows, squats and holds.',
    colour: 'master',
    exercises: [
      { slug: 'incline-push-up', sets: x(3, { reps: range(8, 12), rir: 2 }), rest: 90 },
      { slug: 'inverted-row', sets: x(3, { reps: range(6, 10), rir: 2 }), rest: 90 },
      { slug: 'bodyweight-squat', sets: x(3, { reps: range(12, 20), rir: 2 }), rest: 60 },
      { slug: 'negative-pull-up', sets: x(3, { reps: range(3, 5), rir: 2 }), rest: 120 },
      { slug: 'dead-hang', sets: x(2, { sec: 20 }), rest: 60 },
      { slug: 'plank', sets: x(2, { sec: 30 }), rest: 60 },
    ],
  },
  {
    slug: 'glute-focus',
    name: 'Glute focus',
    description: 'Hip thrusts, RDLs, split squats and kickbacks.',
    colour: 'bronze',
    exercises: [
      { slug: 'barbell-hip-thrust', sets: x(4, { reps: range(8, 12), rir: 2 }), rest: 120 },
      {
        slug: 'dumbbell-romanian-deadlift',
        sets: x(3, { reps: range(10, 12), rir: 2 }),
        rest: 120,
      },
      {
        slug: 'dumbbell-bulgarian-split-squat',
        sets: x(3, { reps: range(8, 12), rir: 2 }),
        rest: 90,
      },
      {
        slug: 'cable-glute-kickback',
        sets: x(3, { reps: range(12, 15), rir: 1 }),
        rest: 0,
        superset: 1,
        roundRest: 60,
      },
      {
        slug: 'hip-abduction-machine',
        sets: x(3, { reps: range(15, 20), rir: 1 }),
        rest: 0,
        superset: 1,
        roundRest: 60,
      },
    ],
  },
  {
    slug: 'dumbbell-home-20',
    name: '20-min dumbbell home',
    description: 'One pair of dumbbells, short rests. Fits a hostel room.',
    colour: 'iron',
    exercises: [
      {
        slug: 'goblet-squat',
        sets: x(3, { reps: range(10, 15), rir: 2 }),
        rest: 0,
        superset: 1,
        roundRest: 45,
      },
      {
        slug: 'dumbbell-floor-press',
        sets: x(3, { reps: range(10, 15), rir: 2 }),
        rest: 0,
        superset: 1,
        roundRest: 45,
      },
      {
        slug: 'one-arm-dumbbell-row',
        sets: x(3, { reps: range(10, 12), rir: 2 }),
        rest: 0,
        superset: 2,
        roundRest: 45,
      },
      {
        slug: 'dumbbell-reverse-lunge',
        sets: x(3, { reps: range(8, 12), rir: 2 }),
        rest: 0,
        superset: 2,
        roundRest: 45,
      },
      { slug: 'plank', sets: x(2, { sec: 40 }), rest: 30 },
    ],
  },
];

export function findTemplate(slug: string): RoutineTemplate | undefined {
  return routineTemplates.find((t) => t.slug === slug);
}

export type TemplateExerciseInfo = Pick<Exercise, 'id' | 'slug' | 'logType' | 'mechanic'>;

/**
 * A template as a new routine of the user's own. Returns null when an exercise isn't in the local
 * library yet (the library hasn't synced). `newId` makes the routine, exercise and set ids.
 */
export function instantiateTemplate(
  template: RoutineTemplate,
  library: readonly TemplateExerciseInfo[],
  newId: () => string,
  now: string,
): RoutineDoc | null {
  const bySlug = new Map(library.map((e) => [e.slug, e]));
  const exercises: RoutineExercise[] = [];
  for (const t of template.exercises) {
    const info = bySlug.get(t.slug);
    if (!info) return null;
    const sets: RoutineSet[] = t.sets.map((ts) => {
      const base = newSet(info.logType, newId());
      const set: RoutineSet = { ...base, setType: ts.type ?? 'working', rir: ts.rir ?? null };
      if (ts.sec !== undefined) return { ...set, targetType: 'duration', durationSec: ts.sec };
      if (typeof ts.reps === 'number') {
        return { ...set, targetType: 'reps', reps: ts.reps, repsMin: null, repsMax: null };
      }
      if (ts.reps) return { ...set, repsMin: ts.reps[0], repsMax: ts.reps[1] };
      return set;
    });
    exercises.push({
      id: newId(),
      exerciseId: info.id,
      supersetGroup: t.superset ?? null,
      restSeconds: t.rest ?? defaultRestSec(info),
      restAfterSupersetSeconds: t.roundRest ?? null,
      notes: t.notes ?? null,
      progressionRule: null,
      sets,
    });
  }
  const normalised = normaliseSupersets(exercises);
  return {
    id: newId(),
    folderId: null,
    name: template.name,
    description: template.description,
    colour: template.colour,
    estimatedDurationMin: estimateDurationMin(normalised),
    source: 'copied',
    sourceRef: `template:${template.slug}`,
    sortOrder: 0,
    archived: false,
    updatedAt: now,
    exercises: normalised,
  };
}

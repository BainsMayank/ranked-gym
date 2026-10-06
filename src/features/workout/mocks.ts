import type { RankTier } from '@/theme';

/**
 * Layout data until the real sources land: plans (Phase 5), routines (Phase 3), live logging
 * (Phase 4, local-first in SQLite). Shapes mirror what those phases will store.
 */

export const setTypes = ['warmup', 'working', 'top', 'drop', 'failure', 'myo'] as const;
export type SetType = (typeof setTypes)[number];

export interface PlannedSet {
  type: SetType;
  kg: string;
  reps: string;
  effort: string;
  previous?: string;
  done?: boolean;
}

export interface RoutineExercise {
  id: string;
  name: string;
  muscles: string;
  mode: 'reps' | 'range' | 'time';
  effort: 'RIR' | 'RPE';
  rest: string;
  note?: string;
  /** Exercises sharing a letter run as a superset. */
  superset?: string;
  /** Column labels differ for bodyweight or timed work. */
  loadLabel?: string;
  repsLabel?: string;
  sets: PlannedSet[];
}

export interface Routine {
  id: string;
  name: string;
  folder: 'PPL' | 'Upper / Lower' | 'Home';
  summary: string;
  meta: string;
  exercises: RoutineExercise[];
}

const legDay: RoutineExercise[] = [
  {
    id: 'squat',
    name: 'Barbell back squat',
    muscles: 'Quads · Glutes · Adductors',
    mode: 'range',
    effort: 'RIR',
    rest: '3:00',
    note: 'Belt on for top set. Pause 1s at the bottom on warm-ups.',
    sets: [
      { type: 'warmup', kg: '60', reps: '8–10', effort: '–', previous: '60 × 10', done: true },
      { type: 'warmup', kg: '100', reps: '5', effort: '–', previous: '100 × 5', done: true },
      { type: 'top', kg: '140', reps: '4–6', effort: '1', previous: '137.5 × 5', done: true },
      { type: 'working', kg: '120', reps: '6–8', effort: '2', previous: '117.5 × 8' },
      { type: 'working', kg: '120', reps: '6–8', effort: '2', previous: '117.5 × 7' },
    ],
  },
  {
    id: 'rdl',
    name: 'Romanian deadlift',
    muscles: 'Hamstrings · Glutes · Lower back',
    mode: 'range',
    effort: 'RIR',
    rest: '2:30',
    sets: [
      { type: 'working', kg: '100', reps: '8–10', effort: '2' },
      { type: 'working', kg: '100', reps: '8–10', effort: '2' },
      { type: 'working', kg: '100', reps: '8–10', effort: '1' },
    ],
  },
  {
    id: 'leg-ext',
    name: 'Leg extension',
    muscles: 'Quads',
    mode: 'range',
    effort: 'RPE',
    rest: 'No rest → next',
    superset: 'A',
    sets: [
      { type: 'working', kg: '55', reps: '10–12', effort: '8' },
      { type: 'working', kg: '55', reps: '10–12', effort: '9' },
      { type: 'drop', kg: '40', reps: 'AMRAP', effort: '10' },
    ],
  },
  {
    id: 'leg-curl',
    name: 'Lying leg curl',
    muscles: 'Hamstrings',
    mode: 'range',
    effort: 'RPE',
    rest: '1:30',
    superset: 'A',
    sets: [
      { type: 'working', kg: '40', reps: '10–12', effort: '8' },
      { type: 'working', kg: '40', reps: '10–12', effort: '9' },
      { type: 'failure', kg: '35', reps: 'Failure', effort: '10' },
    ],
  },
  {
    id: 'plank',
    name: 'Plank',
    muscles: 'Core',
    mode: 'time',
    effort: 'RPE',
    rest: '1:00',
    loadLabel: 'Added kg',
    repsLabel: 'Time',
    sets: [
      { type: 'working', kg: '–', reps: '0:45', effort: '7' },
      { type: 'working', kg: '–', reps: '0:45', effort: '8' },
      { type: 'working', kg: '–', reps: '0:45', effort: '9' },
    ],
  },
];

export const routines: Routine[] = [
  {
    id: 'leg-day',
    name: 'Leg day',
    folder: 'PPL',
    summary: 'Squat, RDL, Leg ext + Leg curl, Plank',
    meta: '5 exercises · 17 sets · ~62 min · last done 3 days ago',
    exercises: legDay,
  },
  {
    id: 'push-a',
    name: 'Push A',
    folder: 'PPL',
    summary: 'Bench, Incline DB, OHP, Lateral raise, Dips',
    meta: '6 exercises · 21 sets · ~55 min · today in plan',
    exercises: legDay,
  },
  {
    id: 'pull-a',
    name: 'Pull A',
    folder: 'Upper / Lower',
    summary: 'Deadlift, Pull-up, Row, Face pull, Curl',
    meta: '6 exercises · 20 sets · ~60 min',
    exercises: legDay,
  },
  {
    id: 'hostel-room',
    name: 'Hostel room workout',
    folder: 'Home',
    summary: 'Push-up, Pike push-up, Squat, Plank',
    meta: 'No equipment · 5 exercises · ~30 min',
    exercises: legDay,
  },
];

export function findRoutine(id: string | undefined): Routine {
  return routines.find((r) => r.id === id) ?? routines[0]!;
}

export const plan = {
  title: 'Get stronger · 4 days / week',
  week: 'Week 3 of 8',
  todayIndex: 2,
  days: [
    { day: 'Mon', focus: 'Push', done: true },
    { day: 'Tue', focus: 'Rest' },
    { day: 'Wed', focus: 'Pull' },
    { day: 'Thu', focus: 'Rest' },
    { day: 'Fri', focus: 'Legs' },
    { day: 'Sat', focus: 'Upper' },
    { day: 'Sun', focus: 'Rest' },
  ],
};

export const quickGenerate = ['Full body', '45 min', 'Dumbbells only'] as const;

export const session = {
  routineId: 'leg-day',
  startedSecondsAgo: 32 * 60 + 14,
  stats: { volume: '700 kg', sets: '3 / 17', kcal: '214' },
  restSeconds: 102,
  next: 'Squat · set 2 · 120 kg × 6–8',
  rankHint: {
    text: 'Hit 142.5 kg × 5 to reach Platinum III on squat',
    tier: 'platinum' as RankTier,
  },
  exerciseRank: { tier: 'gold' as RankTier, division: 1 as const },
};

export const planGoals = [
  { id: 'stronger', title: 'Get stronger', subtitle: 'Raise your lifts and ranks' },
  { id: 'muscle', title: 'Build muscle', subtitle: 'Hypertrophy focus' },
  { id: 'fat', title: 'Lose fat', subtitle: 'Keep strength, drop weight' },
  { id: 'gain', title: 'Gain weight', subtitle: 'Lean bulk structure' },
  { id: 'toned', title: 'Get toned', subtitle: 'Lighter, higher-rep work' },
  { id: 'curvier', title: 'Get curvier', subtitle: 'Glute and lower-body focus' },
  { id: 'calisthenics', title: 'Calisthenics', subtitle: 'Skills and bodyweight strength' },
  { id: 'general', title: 'General fitness', subtitle: 'Balanced, all-round' },
] as const;

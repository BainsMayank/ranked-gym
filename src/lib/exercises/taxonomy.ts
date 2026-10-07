/**
 * The exercise taxonomy: one fixed list of muscles (grouped into body regions) plus the exercise
 * enums. The same values are Postgres enums (see docs/SCHEMA.md); a test keeps the two in sync.
 * Muscle keys are also the path ids of the body-map SVG (Phase 7).
 *
 * Imported by the Node seed generator (supabase/seed/build.ts), so this file must stay free of
 * React Native and `@/` imports.
 */

export const muscles = [
  'upper_chest',
  'mid_lower_chest',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'lats',
  'upper_back',
  'traps',
  'lower_back',
  'abs',
  'obliques',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'abductors',
  'calves',
  'neck',
] as const;
export type Muscle = (typeof muscles)[number];

export const muscleRegions = ['chest', 'shoulders', 'arms', 'back', 'core', 'legs'] as const;
export type MuscleRegion = (typeof muscleRegions)[number];

/** Every muscle except the optional ones belongs to exactly one region. */
export const MUSCLES_BY_REGION = {
  chest: ['upper_chest', 'mid_lower_chest'],
  shoulders: ['front_delts', 'side_delts', 'rear_delts'],
  arms: ['biceps', 'triceps', 'forearms'],
  back: ['lats', 'upper_back', 'traps', 'lower_back'],
  core: ['abs', 'obliques'],
  legs: ['quads', 'hamstrings', 'glutes', 'adductors', 'abductors', 'calves'],
} as const satisfies Record<MuscleRegion, readonly Muscle[]>;

/** Off by default: hidden from filters, the create form and the body map. Still searchable. */
export const OPTIONAL_MUSCLES = ['neck'] as const satisfies readonly Muscle[];

export const muscleLabels: Record<Muscle, string> = {
  upper_chest: 'Upper chest',
  mid_lower_chest: 'Mid/lower chest',
  front_delts: 'Front delts',
  side_delts: 'Side delts',
  rear_delts: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  lats: 'Lats',
  upper_back: 'Upper back & rhomboids',
  traps: 'Traps',
  lower_back: 'Lower back',
  abs: 'Abs',
  obliques: 'Obliques',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  adductors: 'Adductors',
  abductors: 'Abductors',
  calves: 'Calves',
  neck: 'Neck',
};

/** Shorter labels for chips and list rows. */
export const muscleShortLabels: Record<Muscle, string> = {
  ...muscleLabels,
  upper_back: 'Upper back',
};

export const regionLabels: Record<MuscleRegion, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  arms: 'Arms',
  back: 'Back',
  core: 'Core',
  legs: 'Legs',
};

/** The region a muscle belongs to, or null for optional muscles (neck). */
export function muscleRegion(muscle: Muscle): MuscleRegion | null {
  for (const region of muscleRegions) {
    if ((MUSCLES_BY_REGION[region] as readonly Muscle[]).includes(muscle)) return region;
  }
  return null;
}

export function isOptionalMuscle(muscle: Muscle): boolean {
  return (OPTIONAL_MUSCLES as readonly Muscle[]).includes(muscle);
}

export const exerciseCategories = ['strength', 'calisthenics', 'cardio', 'mobility'] as const;
export type ExerciseCategory = (typeof exerciseCategories)[number];

export const equipmentTypes = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'smith',
  'other',
] as const;
export type Equipment = (typeof equipmentTypes)[number];

export const mechanics = ['compound', 'isolation'] as const;
export type Mechanic = (typeof mechanics)[number];

export const logTypes = [
  'weight_reps',
  'bodyweight_reps',
  'weighted_bodyweight',
  'assisted_bodyweight',
  'duration',
  'distance_duration',
] as const;
export type LogType = (typeof logTypes)[number];

export const muscleRoles = ['primary', 'secondary', 'stabiliser'] as const;
export type MuscleRole = (typeof muscleRoles)[number];

/**
 * How much of a set counts towards each muscle's volume. Secondary movers count half (or a quarter
 * when they only help a little); stabilisers a quarter.
 */
export const ROLE_WEIGHTS = {
  primary: [1],
  secondary: [0.5, 0.25],
  stabiliser: [0.25],
} as const satisfies Record<MuscleRole, readonly number[]>;

export function isValidRoleWeight(role: MuscleRole, weight: number): boolean {
  return (ROLE_WEIGHTS[role] as readonly number[]).includes(weight);
}

export const categoryLabels: Record<ExerciseCategory, string> = {
  strength: 'Strength',
  calisthenics: 'Calisthenics',
  cardio: 'Cardio',
  mobility: 'Mobility',
};

export const equipmentLabels: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  smith: 'Smith machine',
  other: 'Other',
};

export const logTypeLabels: Record<LogType, { label: string; description: string }> = {
  weight_reps: { label: 'Weight and reps', description: 'Barbells, dumbbells, machines' },
  bodyweight_reps: { label: 'Reps only', description: 'Push-ups, crunches, air squats' },
  weighted_bodyweight: {
    label: 'Bodyweight + added weight',
    description: 'Pull-ups or dips with a belt',
  },
  assisted_bodyweight: {
    label: 'Bodyweight − assistance',
    description: 'Assisted pull-up machine, bands',
  },
  duration: { label: 'Time', description: 'Planks, holds, stretches' },
  distance_duration: { label: 'Distance and time', description: 'Running, cycling, rowing' },
};

export const roleLabels: Record<MuscleRole, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  stabiliser: 'Stabiliser',
};

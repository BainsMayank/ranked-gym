import type {
  Equipment,
  ExerciseCategory,
  LogType,
  Mechanic,
  Muscle,
  MuscleRole,
} from './taxonomy';

export interface ExerciseMuscle {
  muscle: Muscle;
  role: MuscleRole;
  /** Share of a set's volume that counts for this muscle (1, 0.5 or 0.25). */
  weight: number;
}

/** One exercise as the app uses it: official (createdBy null) or the user's custom exercise. */
export interface Exercise {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  category: ExerciseCategory;
  equipment: Equipment;
  mechanic: Mechanic;
  logType: LogType;
  unilateral: boolean;
  instructions: string[];
  tips: string[];
  commonMistakes: string[];
  mediaUrl: string | null;
  metValue: number;
  isRankable: boolean;
  rankKey: string | null;
  createdBy: string | null;
  updatedAt: string;
  muscles: ExerciseMuscle[];
}

export interface ExerciseUsage {
  exerciseId: string;
  useCount: number;
  /** Epoch milliseconds. */
  lastUsedAt: number;
}

export function isCustomExercise(exercise: Pick<Exercise, 'createdBy'>): boolean {
  return exercise.createdBy !== null;
}

export function musclesWithRole(exercise: Pick<Exercise, 'muscles'>, role: MuscleRole): Muscle[] {
  return exercise.muscles.filter((m) => m.role === role).map((m) => m.muscle);
}

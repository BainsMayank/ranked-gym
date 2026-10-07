/**
 * Shape of an official exercise in the seed, plus `defineExercises` which fills in the defaults.
 * Imported by Node (build.ts, native type stripping) and by Jest, so imports are relative with the
 * `.ts` extension and nothing here may touch React Native.
 */
import type {
  Equipment,
  ExerciseCategory,
  LogType,
  Mechanic,
  Muscle,
  MuscleRole,
} from '../../src/lib/exercises/taxonomy.ts';
import type { RankKey } from '../../src/lib/game/rankKeys.ts';

export interface ExerciseSeedInput {
  name: string;
  /** Defaults to the slugified name. Never change a published slug: it's the upsert key. */
  slug?: string;
  aliases?: string[];
  /** Defaults to 'strength'. */
  category?: ExerciseCategory;
  equipment: Equipment;
  mechanic: Mechanic;
  logType: LogType;
  unilateral?: boolean;
  instructions: string[];
  tips?: string[];
  mistakes?: string[];
  /** Defaults by category and mechanic (see `defaultMet`). */
  met?: number;
  rankKey?: RankKey;
  /** Weight 1. */
  primary: Muscle[];
  /** Weight 0.5. */
  secondary?: Muscle[];
  /** Secondary movers that only help a little: weight 0.25. */
  light?: Muscle[];
  /** Weight 0.25. */
  stabiliser?: Muscle[];
}

export interface SeedMuscle {
  muscle: Muscle;
  role: MuscleRole;
  weight: number;
}

export interface ExerciseSeed {
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
  mistakes: string[];
  met: number;
  rankKey: RankKey | null;
  muscles: SeedMuscle[];
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Compendium of Physical Activities ballpark values. */
function defaultMet(category: ExerciseCategory, mechanic: Mechanic): number {
  switch (category) {
    case 'strength':
      return mechanic === 'compound' ? 5 : 3.5;
    case 'calisthenics':
      return mechanic === 'compound' ? 4.5 : 3.5;
    case 'cardio':
      return 7;
    case 'mobility':
      return 2.3;
  }
}

export function defineExercises(inputs: ExerciseSeedInput[]): ExerciseSeed[] {
  return inputs.map((input) => {
    const category = input.category ?? 'strength';
    return {
      slug: input.slug ?? slugify(input.name),
      name: input.name,
      aliases: input.aliases ?? [],
      category,
      equipment: input.equipment,
      mechanic: input.mechanic,
      logType: input.logType,
      unilateral: input.unilateral ?? false,
      instructions: input.instructions,
      tips: input.tips ?? [],
      mistakes: input.mistakes ?? [],
      met: input.met ?? defaultMet(category, input.mechanic),
      rankKey: input.rankKey ?? null,
      muscles: [
        ...input.primary.map((muscle) => ({ muscle, role: 'primary' as const, weight: 1 })),
        ...(input.secondary ?? []).map((muscle) => ({
          muscle,
          role: 'secondary' as const,
          weight: 0.5,
        })),
        ...(input.light ?? []).map((muscle) => ({
          muscle,
          role: 'secondary' as const,
          weight: 0.25,
        })),
        ...(input.stabiliser ?? []).map((muscle) => ({
          muscle,
          role: 'stabiliser' as const,
          weight: 0.25,
        })),
      ],
    };
  });
}

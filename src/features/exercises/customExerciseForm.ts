import { z } from 'zod';

import { equipmentTypes, logTypes, muscles, type Exercise, type Muscle } from '@/lib/exercises';

export const customExerciseSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: 'At least 2 characters.' })
      .max(60, { error: '60 characters at most.' }),
    equipment: z.enum(equipmentTypes, { error: 'Pick the equipment.' }),
    logType: z.enum(logTypes, { error: 'Pick how you log it.' }),
    primary: z.array(z.enum(muscles)).min(1, { error: 'Pick at least one primary muscle.' }),
    secondary: z.array(z.enum(muscles)),
  })
  .refine((v) => !v.primary.some((m) => v.secondary.includes(m)), {
    error: 'A muscle can’t be both primary and secondary.',
    path: ['secondary'],
  });

export type CustomExerciseValues = {
  name: string;
  equipment: string;
  logType: string;
  primary: Muscle[];
  secondary: Muscle[];
};

export type CustomExerciseErrors = Partial<Record<keyof CustomExerciseValues, string>>;

export function initialValues(exercise: Exercise | null, name = ''): CustomExerciseValues {
  if (!exercise) return { name, equipment: '', logType: 'weight_reps', primary: [], secondary: [] };
  return {
    name: exercise.name,
    equipment: exercise.equipment,
    logType: exercise.logType,
    primary: exercise.muscles.filter((m) => m.role === 'primary').map((m) => m.muscle),
    secondary: exercise.muscles.filter((m) => m.role !== 'primary').map((m) => m.muscle),
  };
}

export function validate(values: CustomExerciseValues) {
  const result = customExerciseSchema.safeParse(values);
  const errors: CustomExerciseErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof CustomExerciseValues | undefined;
      if (key && errors[key] === undefined) errors[key] = issue.message;
    }
  }
  return { data: result.success ? result.data : undefined, errors };
}

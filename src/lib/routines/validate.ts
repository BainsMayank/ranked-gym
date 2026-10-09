import { z } from 'zod';

import { TEMPO_PATTERN } from './parse';
import {
  ROUTINE_LIMITS as L,
  routineColours,
  routineSources,
  setTypes,
  targetTypes,
  weightModes,
} from './taxonomy';
import type { RoutineDoc } from './types';

/**
 * A routine document as the server accepts it (mirrors the table checks and save_routine). The
 * editor validates before saving so a bad draft never reaches the sync queue.
 */

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const nullableInt = (min: number, max: number) => int(min, max).nullable();

export const routineSetSchema = z
  .object({
    id: z.uuid(),
    setType: z.enum(setTypes),
    targetType: z.enum(targetTypes),
    reps: nullableInt(1, L.repsMax),
    repsMin: nullableInt(1, L.repsMax),
    repsMax: nullableInt(1, L.repsMax),
    durationSec: nullableInt(1, L.durationMaxSec),
    distanceM: nullableInt(1, L.distanceMaxM),
    weightKg: z.number().min(0).max(L.weightMaxKg).nullable(),
    weightMode: z.enum(weightModes),
    weightPercent: z.number().min(1).max(L.percentMax).nullable(),
    rir: nullableInt(0, 5),
    rpe: z
      .number()
      .min(5)
      .max(10)
      .refine((v) => Number.isInteger(v * 2), { error: 'RPE goes in steps of 0.5.' })
      .nullable(),
    tempo: z.string().regex(TEMPO_PATTERN).nullable(),
  })
  .check((ctx) => {
    const s = ctx.value;
    const issue = (message: string) => ctx.issues.push({ code: 'custom', message, input: s });
    if (s.targetType === 'reps' && s.reps === null) issue('Enter the reps.');
    if (s.targetType === 'rep_range') {
      if (s.repsMin === null || s.repsMax === null || s.repsMin >= s.repsMax) {
        issue('A rep range needs a low and a high number.');
      }
    }
    if (s.targetType === 'duration' && s.durationSec === null) issue('Enter a time.');
    if (s.targetType === 'distance' && s.distanceM === null) issue('Enter a distance.');
    const percent = s.weightMode === 'percent_of_1rm' || s.weightMode === 'percent_of_top_set';
    if (percent && s.weightPercent === null) issue('Enter a percentage.');
    if (!percent && s.weightPercent !== null) issue('Only percentage loads take a percentage.');
  });

export const routineExerciseSchema = z.object({
  id: z.uuid(),
  exerciseId: z.uuid(),
  supersetGroup: nullableInt(1, 100),
  restSeconds: int(0, L.restMaxSec),
  restAfterSupersetSeconds: nullableInt(0, L.restMaxSec),
  notes: z.string().max(L.textMax).nullable(),
  progressionRule: z.record(z.string(), z.unknown()).nullable(),
  sets: z
    .array(routineSetSchema)
    .max(L.setsMax, { error: `${L.setsMax} sets per exercise at most.` })
    .refine((sets) => sets[0]?.setType !== 'drop', { error: 'A drop set needs a set before it.' }),
});

export const routineDocSchema = z.object({
  id: z.uuid(),
  folderId: z.uuid().nullable(),
  name: z.string().trim().min(1, { error: 'Give the routine a name.' }).max(L.nameMax),
  description: z.string().max(L.textMax).nullable(),
  colour: z.enum(routineColours).nullable(),
  estimatedDurationMin: int(0, 1440),
  source: z.enum(routineSources),
  sourceRef: z.string().max(100).nullable(),
  sortOrder: z.number().int(),
  archived: z.boolean(),
  updatedAt: z.string(),
  exercises: z
    .array(routineExerciseSchema)
    .max(L.exercisesMax, { error: `${L.exercisesMax} exercises per routine at most.` }),
});

export type RoutineValidation = { ok: true } | { ok: false; message: string };

export function validateRoutineDoc(doc: RoutineDoc): RoutineValidation {
  const result = routineDocSchema.safeParse(doc);
  if (result.success) return { ok: true };
  return { ok: false, message: result.error.issues[0]?.message ?? 'Check the routine.' };
}

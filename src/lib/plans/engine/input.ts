import { z } from 'zod';

import { equipmentTypes, type Equipment } from '@/lib/exercises/taxonomy';
import type { ExperienceLevel, PrimaryGoal } from '@/lib/profile/options';

import {
  equipmentPresets,
  planLengths,
  sessionMinutes,
  volumeGroups,
  type PlanEquipment,
  type PlanInput,
  type PlanSettings,
} from './types';

/** The questionnaire as data: validation, presets and defaults. */

const goals = [
  'stronger',
  'muscle',
  'fat',
  'gain',
  'toned',
  'curvier',
  'calisthenics',
  'general',
] as const satisfies readonly PrimaryGoal[];
const levels = [
  'beginner',
  'intermediate',
  'advanced',
] as const satisfies readonly ExperienceLevel[];

const literal = <T extends readonly number[]>(values: T) =>
  z
    .number()
    .refine((v): v is T[number] => values.includes(v), { error: 'Pick one of the options.' });

export const planInputSchema = z.object({
  goal: z.enum(goals),
  level: z.enum(levels),
  schedule: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('count'), days: z.number().int().min(2).max(6) }),
    z.object({
      kind: z.literal('weekdays'),
      weekdays: z.array(z.number().int().min(0).max(6)).min(2).max(6),
    }),
  ]),
  minutes: literal(sessionMinutes),
  cardio: z.boolean(),
  equipment: z.object({
    preset: z.enum(equipmentPresets),
    custom: z.array(z.enum(equipmentTypes)),
    bars: z.boolean(),
  }),
  priorities: z.array(z.enum(volumeGroups)).max(3),
  avoid: z.array(z.string()).max(50),
  weeks: literal(planLengths),
});

export const planSettingsSchema = z.object({
  v: z.literal(1),
  input: planInputSchema,
  seed: z.number().int(),
});

export function parsePlanSettings(value: unknown): PlanSettings | null {
  const result = planSettingsSchema.safeParse(value);
  return result.success ? (result.data as PlanSettings) : null;
}

export const equipmentPresetLabels: Record<PlanEquipment['preset'], string> = {
  gym: 'Full gym',
  dumbbells: 'Home dumbbells',
  bodyweight: 'Bodyweight only',
  custom: 'Custom list',
};

/** What a preset gives you. Bodyweight is always in. */
export function availableEquipment(equipment: PlanEquipment): Set<Equipment> {
  switch (equipment.preset) {
    case 'gym':
      return new Set(equipmentTypes);
    case 'dumbbells':
      return new Set(['dumbbell', 'bodyweight']);
    case 'bodyweight':
      return new Set(['bodyweight']);
    case 'custom':
      return new Set([...equipment.custom, 'bodyweight']);
  }
}

export function hasBars(equipment: PlanEquipment): boolean {
  return equipment.preset === 'gym' || equipment.bars;
}

/** Training days: the weekdays picked, or a count (2–6). */
export function dayCount(input: Pick<PlanInput, 'schedule'>): number {
  return input.schedule.kind === 'count' ? input.schedule.days : input.schedule.weekdays.length;
}

/** Only fat-loss and toned plans add the finisher. */
export function wantsFinisher(input: Pick<PlanInput, 'goal' | 'cardio'>): boolean {
  return input.cardio && (input.goal === 'fat' || input.goal === 'toned');
}

export const defaultPlanInput: PlanInput = {
  goal: 'muscle',
  level: 'beginner',
  schedule: { kind: 'count', days: 3 },
  minutes: 60,
  cardio: true,
  equipment: { preset: 'gym', custom: [], bars: true },
  priorities: [],
  avoid: [],
  weeks: 6,
};

/** Starts the questionnaire on what onboarding already knows. */
export function inputFromProfile(
  profile: { primary_goal: PrimaryGoal | null; experience_level: ExperienceLevel | null } | null,
): PlanInput {
  return {
    ...defaultPlanInput,
    goal: profile?.primary_goal ?? defaultPlanInput.goal,
    level: profile?.experience_level ?? defaultPlanInput.level,
  };
}

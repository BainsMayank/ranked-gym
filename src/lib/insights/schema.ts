import { z } from 'zod';

import { muscles } from '@/lib/exercises/taxonomy';

const numeric = z.coerce.number().finite();
const period = z.object({
  period: numeric,
  sessions: numeric,
  volume: numeric,
  duration: numeric,
  calories: numeric.nullable(),
  missing_calories: numeric,
});
export const analyticsSchema = z.object({
  asOf: z.string(),
  start: z.string(),
  end: z.string(),
  zone: z.string(),
  speed: z.enum(['slower', 'normal', 'faster']),
  streak: numeric,
  periods: z.array(period).length(2),
  daily: z.array(
    z.object({ day: z.string(), sessions: numeric, volume: numeric, duration: numeric }),
  ),
  muscles: z.array(z.object({ muscle: z.enum(muscles), sets: numeric, volume: numeric })),
  fatigue: z.array(
    z.object({ muscle: z.enum(muscles), fatigue: numeric, last_trained: z.string() }),
  ),
  bodyweight: z.array(z.object({ at: z.string(), kg: numeric })),
  records: z.array(
    z.object({
      id: z.coerce.string(),
      at: z.string(),
      name: z.string(),
      kind: z.string(),
      value: numeric,
      previous_value: numeric,
      weight_kg: numeric.nullable().optional(),
      workout_id: z.string(),
    }),
  ),
  previous_records: numeric,
  rankups: z.array(
    z.object({
      id: z.coerce.string(),
      at: z.string(),
      name: z.string(),
      tier: z.string(),
      division: numeric.nullable(),
      workout_id: z.string().nullable(),
    }),
  ),
});
export type Analytics = z.infer<typeof analyticsSchema>;

export const goalTypes = [
  'lift',
  'rank',
  'bodyweight',
  'weekly_workouts',
  'streak',
  'monthly_volume',
  'custom',
] as const;
export type GoalType = (typeof goalTypes)[number];
export const goalLabels: Record<GoalType, string> = {
  lift: 'Lift target',
  rank: 'Rank target',
  bodyweight: 'Bodyweight',
  weekly_workouts: 'Workouts per week',
  streak: 'Streak length',
  monthly_volume: 'Monthly volume',
  custom: 'Custom checkbox',
};
export const targetSchema = z.object({
  title: z.string().min(1).max(80),
  exercise_id: z.string().optional(),
  weight_kg: numeric.optional(),
  reps: numeric.optional(),
  scope: z.enum(['overall', 'lift']).optional(),
  key: z.string().optional(),
  score: numeric.optional(),
  kg: numeric.optional(),
  value: numeric.optional(),
  checked: z.boolean().optional(),
});
export type GoalTarget = z.infer<typeof targetSchema>;
export const goalSchema = z.object({
  id: z.string(),
  type: z.enum(goalTypes),
  target: targetSchema,
  start_value: numeric,
  current_value: numeric,
  target_value: numeric,
  deadline: z.string().nullable(),
  status: z.enum(['active', 'achieved', 'archived']),
  auto_post: z.boolean(),
  achieved_at: z.string().nullable(),
  created_at: z.string(),
  observations: z.array(z.object({ at: z.string(), value: numeric })).default([]),
});
export type Goal = z.infer<typeof goalSchema>;

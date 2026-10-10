import { sql } from 'drizzle-orm';
import { Storage } from 'expo-sqlite/kv-store';
import { z } from 'zod';

import { ensureDb } from '@/lib/db/ensureDb';

import type { GoalInput } from './hooks';
import { localBodyweight } from './localBodyweight';
import { loadLocalAnalytics } from './localAnalytics';
import { rangeFor } from './metrics';
import { goalSchema, type Goal } from './schema';

const key = 'insights.preview.goals';
function read(): Goal[] {
  try {
    return z.array(goalSchema).parse(JSON.parse(Storage.getItemSync(key) ?? '[]'));
  } catch {
    return [];
  }
}
function write(goals: Goal[]) {
  Storage.setItemSync(key, JSON.stringify(goals));
}
export function localRecoverySpeed() {
  const speed = Storage.getItemSync('insights.preview.speed');
  return speed === 'slower' || speed === 'faster' ? speed : 'normal';
}
export function setLocalRecoverySpeed(speed: string) {
  Storage.setItemSync('insights.preview.speed', speed);
}
const targetValue = (g: GoalInput) =>
  g.type === 'lift'
    ? g.target.weight_kg!
    : g.type === 'rank'
      ? g.target.score!
      : g.type === 'bodyweight'
        ? g.target.kg!
        : g.type === 'custom'
          ? 1
          : g.target.value!;

async function current(g: Pick<Goal, 'type' | 'target'>): Promise<number> {
  if (g.type === 'custom') return g.target.checked ? 1 : 0;
  if (g.type === 'bodyweight') return localBodyweight().at(-1)?.kg ?? 0;
  if (g.type === 'rank') return 0; // Rank awards require server validation, even in development.
  const db = await ensureDb();
  if (g.type === 'lift')
    return (
      db.get<{ value: number | null }>(sql`
    select max(s.weight_kg) value from workout_sets s join workout_exercises e on e.id=s.workout_exercise_id
    join workouts w on w.id=e.workout_id where w.status='completed' and s.completed=1 and s.failed=0
    and s.set_type!='warmup' and s.weight_mode in ('absolute','bodyweight')
    and e.exercise_id=${g.target.exercise_id!} and s.reps>=${g.target.reps!}`)?.value ?? 0
    );
  const now = new Date(),
    start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (g.type === 'monthly_volume') start.setDate(1);
  else start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (g.type === 'streak') {
    const bounds = rangeFor(7, now);
    return (
      await loadLocalAnalytics(
        bounds.start,
        bounds.end,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        localRecoverySpeed(),
      )
    ).streak;
  }
  return (
    db.get<{ value: number }>(
      sql`select ${g.type === 'monthly_volume' ? sql`coalesce(sum(total_volume_kg),0)` : sql`count(*)`} value from workouts where status='completed' and started_at>=${start.toISOString()} and started_at<=${now.toISOString()}`,
    )?.value ?? 0
  );
}
export async function loadLocalGoals() {
  const goals = read();
  for (const g of goals) {
    if (g.status !== 'active') continue;
    g.current_value = await current(g);
    if (g.type === 'bodyweight')
      g.observations = localBodyweight().map((p) => ({ at: p.at, value: p.kg }));
    const achieved =
      g.type !== 'rank' &&
      (g.type === 'bodyweight' && g.target_value < g.start_value
        ? g.current_value > 0 && g.current_value <= g.target_value
        : g.current_value >= g.target_value);
    if (achieved) {
      g.status = 'achieved';
      g.achieved_at = new Date().toISOString();
    }
  }
  write(goals);
  return goals;
}
export async function saveLocalGoal(input: GoalInput) {
  const goals = read(),
    existing = goals.find((g) => g.id === input.id);
  const value = await current({ type: input.type, target: input.target });
  if (input.type === 'bodyweight' && !value) throw new Error('Log your current bodyweight first.');
  const goal: Goal = {
    id: input.id,
    type: input.type,
    target: input.target,
    start_value: existing?.start_value ?? value,
    current_value: value,
    target_value: targetValue(input),
    deadline: input.deadline,
    status: input.archive ? 'archived' : (existing?.status ?? 'active'),
    auto_post: false,
    achieved_at: existing?.achieved_at ?? null,
    created_at: existing?.created_at ?? new Date().toISOString(),
    observations: existing?.observations ?? [],
  };
  write([...goals.filter((g) => g.id !== goal.id), goal]);
  await loadLocalGoals();
}

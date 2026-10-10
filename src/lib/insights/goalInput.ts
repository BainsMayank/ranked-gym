import { validDate } from './metrics';
import type { GoalTarget, GoalType } from './schema';

export function goalTargetInput(input: {
  type: GoalType;
  title: string;
  target: GoalTarget;
  number: string;
  reps: string;
  deadline: string;
  hasBodyweight: boolean;
}): { target: GoalTarget } | { error: string } {
  const { type, target, deadline, hasBodyweight } = input;
  const title = input.title.trim(),
    n = Number(input.number),
    reps = Number(input.reps);
  if (!title) return { error: 'Give your goal a name.' };
  if (deadline && !validDate(deadline))
    return { error: 'Use a valid deadline in YYYY-MM-DD format.' };
  if (type === 'lift') {
    if (
      !target.exercise_id ||
      !Number.isFinite(n) ||
      n <= 0 ||
      !Number.isInteger(reps) ||
      reps < 1 ||
      reps > 500
    )
      return { error: 'Choose an exercise, a positive kg target and whole reps.' };
    return { target: { title, exercise_id: target.exercise_id, weight_kg: n, reps } };
  }
  if (type === 'rank')
    return {
      target: {
        title,
        scope: target.scope ?? 'overall',
        key: target.key ?? 'overall',
        score: target.score ?? 400,
      },
    };
  if (type === 'bodyweight') {
    if (!hasBodyweight || !Number.isFinite(n) || n < 20 || n > 400)
      return {
        error: 'Log your current bodyweight first, then choose a target from 20 to 400 kg.',
      };
    return { target: { title, kg: n } };
  }
  if (type === 'custom') return { target: { title, checked: target.checked ?? false } };
  if (
    !Number.isFinite(n) ||
    n <= 0 ||
    (type !== 'monthly_volume' && !Number.isInteger(n)) ||
    (type === 'weekly_workouts' && n > 14) ||
    (type === 'streak' && n > 366)
  )
    return { error: 'Choose a positive target (up to 14 weekly workouts or 366 streak days).' };
  return { target: { title, value: n } };
}

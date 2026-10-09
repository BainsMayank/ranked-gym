import { formatRest } from '@/lib/routines';
import type { RoutineExercise } from '@/lib/routines';
import { weekdayOf, weekdayShort } from '@/lib/plans';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thu 8 Oct" from 'YYYY-MM-DD'. */
export function formatPlanDate(date: string): string {
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${weekdayShort[weekdayOf(date)]} ${d} ${MONTHS[m - 1]}`;
}

/** "3 × 8–12 · rest 1:30" (working sets only; warm-ups noted). */
export function setSummary(e: RoutineExercise): string {
  const working = e.sets.filter((s) => s.setType !== 'warmup');
  const warmups = e.sets.length - working.length;
  const first = working[0];
  let target = '';
  if (first?.targetType === 'duration') target = `${first.durationSec} s`;
  else if (first?.targetType === 'reps') target = `${first.reps}`;
  else if (first?.targetType === 'rep_range') target = `${first.repsMin}–${first.repsMax}`;
  else if (first?.durationSec) target = `${Math.round(first.durationSec / 60)} min`;
  const top = working.some((s) => s.setType === 'top') ? ' (top set + back-offs)' : '';
  const warm = warmups ? ` + ${warmups} warm-up${warmups > 1 ? 's' : ''}` : '';
  const rest = e.restAfterSupersetSeconds ?? e.restSeconds;
  return `${working.length} × ${target}${top}${warm}${rest ? ` · rest ${formatRest(rest)}` : ''}`;
}

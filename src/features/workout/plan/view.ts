import {
  addDays,
  currentWeek,
  isOpen,
  missedDays,
  mondayOf,
  progress,
  type PlanDay,
  type PlanDoc,
} from '@/lib/plans';

export type DayState = 'done' | 'missed' | 'today' | 'upcoming' | 'rest';

export interface StripDay {
  date: string;
  day: PlanDay | null;
  state: DayState;
}

/** What the plan card and overview show for a plan on a given day. Pure. */
export interface PlanView {
  week: number;
  weeks: number;
  done: number;
  total: number;
  /** An open session scheduled today. */
  today: PlanDay | null;
  /** The next open session after today. */
  next: PlanDay | null;
  /** Mon–Sun of this calendar week. */
  strip: StripDay[];
  missed: PlanDay[];
  finished: boolean;
  paused: boolean;
}

export function stateOf(day: PlanDay | null, date: string, today: string): DayState {
  if (!day) return 'rest';
  if (day.status === 'done') return 'done';
  if (day.status === 'missed' || (isOpen(day) && date < today)) return 'missed';
  return date === today ? 'today' : 'upcoming';
}

export function planView(plan: PlanDoc, today: string): PlanView {
  const { done, total } = progress(plan);
  const byDate = new Map<string, PlanDay>();
  for (const d of plan.days) if (!byDate.has(d.date) || isOpen(d)) byDate.set(d.date, d);
  const monday = mondayOf(today);
  const strip = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const day = byDate.get(date) ?? null;
    return { date, day, state: stateOf(day, date, today) };
  });
  const open = plan.days.filter(isOpen);
  return {
    week: currentWeek(plan, today),
    weeks: plan.weeks.length,
    done,
    total,
    today: open.find((d) => d.date === today) ?? null,
    next: open.find((d) => d.date > today) ?? null,
    strip,
    missed: missedDays(plan, today),
    finished: today > plan.endDate,
    paused: plan.pausedAt !== null,
  };
}

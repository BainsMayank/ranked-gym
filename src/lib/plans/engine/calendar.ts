import { familiesOverlap } from './splits';
import type {
  GeneratedPlan,
  PlanDay,
  PlanDoc,
  PlanWeek,
  StartChoice,
  TemplateFamily,
} from './types';

/**
 * The plan on the calendar. Dates are local calendar days as 'YYYY-MM-DD'; weeks run Monday to
 * Sunday. Everything here is pure: callers pass today's date.
 */

// ─── Dates ──────────────────────────────────────────────────────────────────────────────────────

function parts(date: string): [number, number, number] {
  return date.split('-').map(Number) as [number, number, number];
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from a to b. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Mon = 0 … Sun = 6. */
export function weekdayOf(date: string): number {
  const [y, m, d] = parts(date);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function mondayOf(date: string): string {
  return addDays(date, -weekdayOf(date));
}

/** A device-local Date as 'YYYY-MM-DD'. */
export function localDateKey(at: Date): string {
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return `${at.getFullYear()}-${m}-${d}`;
}

// ─── Laying a plan out ──────────────────────────────────────────────────────────────────────────

/** Default start: this week when at least half its sessions (today included) are still ahead. */
export function defaultStart(plan: Pick<GeneratedPlan, 'week'>, today: string): StartChoice {
  const left = plan.week.filter((d) => d.weekday >= weekdayOf(today)).length;
  return left * 2 >= plan.week.length && left > 0 ? 'this_week' : 'next_week';
}

export function schedulePlan(
  plan: GeneratedPlan,
  opts: { today: string; start: StartChoice; newId: () => string },
): Pick<PlanDoc, 'startDate' | 'endDate' | 'weeks' | 'days'> {
  const weeksCount = plan.settings.input.weeks;
  const firstMonday = addDays(mondayOf(opts.today), opts.start === 'this_week' ? 0 : 7);
  const byKey = new Map(plan.sessions.map((s) => [s.key, s]));
  const weeks: PlanWeek[] = [];
  const days: PlanDay[] = [];
  for (let w = 1; w <= weeksCount; w++) {
    const startsOn = addDays(firstMonday, (w - 1) * 7);
    const deload = w === weeksCount && weeksCount >= 6;
    weeks.push({ id: opts.newId(), week: w, startsOn, deload });
    for (const { weekday, key } of plan.week) {
      const date = addDays(startsOn, weekday);
      if (date < opts.today) continue;
      const session = byKey.get(key)!;
      days.push({
        id: opts.newId(),
        week: w,
        date,
        originalDate: date,
        templateKey: key,
        label: session.label,
        routineId: (deload ? session.deload : null)?.id ?? session.routine.id,
        status: 'pending',
      });
    }
  }
  return {
    startDate: opts.start === 'this_week' ? opts.today : firstMonday,
    endDate: addDays(firstMonday, weeksCount * 7 - 1),
    weeks,
    days,
  };
}

// ─── Status ─────────────────────────────────────────────────────────────────────────────────────

export function isOpen(day: Pick<PlanDay, 'status'>): boolean {
  return day.status === 'pending' || day.status === 'moved';
}

/** Open sessions whose day has passed (none while paused). */
export function missedDays(plan: Pick<PlanDoc, 'days' | 'pausedAt'>, today: string): PlanDay[] {
  if (plan.pausedAt) return [];
  return plan.days.filter((d) => isOpen(d) && d.date < today);
}

export function currentWeek(plan: Pick<PlanDoc, 'weeks'>, today: string): number {
  let week = 1;
  for (const w of plan.weeks) if (w.startsOn <= today) week = w.week;
  return week;
}

export function progress(plan: Pick<PlanDoc, 'days'>): { done: number; total: number } {
  return { done: plan.days.filter((d) => d.status === 'done').length, total: plan.days.length };
}

// ─── Editing ────────────────────────────────────────────────────────────────────────────────────

type FamilyOf = (templateKey: string) => TemplateFamily | null;

function sortDays(days: PlanDay[]): PlanDay[] {
  return days.sort((a, b) => a.date.localeCompare(b.date) || a.week - b.week);
}

/** Labels of sessions on the day before or after `date` that train the same muscles. */
export function neighbourClash(
  days: readonly PlanDay[],
  id: string,
  date: string,
  familyOf: FamilyOf,
): string | null {
  const me = days.find((d) => d.id === id);
  const mine = me && familyOf(me.templateKey);
  if (!me || !mine) return null;
  for (const d of days) {
    if (d.id === id || d.status === 'missed') continue;
    if (Math.abs(daysBetween(d.date, date)) !== 1) continue;
    const theirs = familyOf(d.templateKey);
    if (theirs && familiesOverlap(mine, theirs)) return d.label;
  }
  return null;
}

export type MoveResult =
  { ok: true; days: PlanDay[]; warning: string | null } | { ok: false; reason: string };

/** Moves one session to another free day this week (today or later). */
export function moveDay(
  plan: Pick<PlanDoc, 'days' | 'weeks'>,
  id: string,
  date: string,
  today: string,
  familyOf: FamilyOf,
): MoveResult {
  const day = plan.days.find((d) => d.id === id);
  if (!day) return { ok: false, reason: 'That session is no longer in the plan.' };
  if (!isOpen(day)) return { ok: false, reason: 'Only sessions still to do can move.' };
  if (date < today) return { ok: false, reason: 'Pick today or a later day.' };
  if (mondayOf(date) !== mondayOf(day.date) && mondayOf(date) !== mondayOf(today)) {
    return { ok: false, reason: 'Sessions move within their week.' };
  }
  if (plan.days.some((d) => d.id !== id && d.date === date && d.status !== 'missed')) {
    return { ok: false, reason: 'There’s already a session that day.' };
  }
  const clash = neighbourClash(plan.days, id, date, familyOf);
  const days = sortDays(
    plan.days.map((d) => (d.id === id ? { ...d, date, status: 'moved' as const } : d)),
  );
  return {
    ok: true,
    days,
    warning: clash
      ? `${day.label} would be right next to ${clash}, which trains the same muscles.`
      : null,
  };
}

export function skipDay(days: readonly PlanDay[], id: string): PlanDay[] {
  return days.map((d) => (d.id === id ? { ...d, status: 'missed' as const } : d));
}

/**
 * "Shift the week": the missed session moves to today (or the next day that doesn't sit right
 * next to a session training the same muscles), and every open session after it moves by the same
 * number of days, so the spacing between sessions stays as planned. The plan ends later.
 */
export function shiftFromMissed(
  plan: Pick<PlanDoc, 'days' | 'endDate'>,
  id: string,
  today: string,
  familyOf: FamilyOf,
): Pick<PlanDoc, 'days' | 'endDate'> {
  const missed = plan.days.find((d) => d.id === id);
  if (!missed) return plan;
  const shift = (delta: number) =>
    plan.days.map((d) =>
      isOpen(d) && d.date >= missed.date
        ? {
            ...d,
            date: addDays(d.date, delta),
            status: d.id === id ? ('moved' as const) : d.status,
          }
        : d,
    );
  let delta = Math.max(0, daysBetween(missed.date, today));
  let days = shift(delta);
  for (
    let tries = 0;
    tries < 3 && neighbourClash(days, id, addDays(missed.date, delta), familyOf);
    tries++
  ) {
    delta += 1;
    days = shift(delta);
  }
  return { days: sortDays(days), endDate: addDays(plan.endDate, delta) };
}

/** Resuming a pause moves every open session from the pause day on by the days paused. */
export function resumeShift(
  plan: Pick<PlanDoc, 'days' | 'endDate'>,
  pausedOn: string,
  today: string,
): Pick<PlanDoc, 'days' | 'endDate'> {
  const delta = Math.max(0, daysBetween(pausedOn, today));
  if (delta === 0) return plan;
  return {
    days: plan.days.map((d) =>
      isOpen(d) && d.date >= pausedOn ? { ...d, date: addDays(d.date, delta) } : d,
    ),
    endDate: addDays(plan.endDate, delta),
  };
}

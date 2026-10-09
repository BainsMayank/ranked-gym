import { familiesOverlap, splitOptions, type SessionTemplate, type SplitChoice } from './splits';
import type { PlanGoal, PlanLevel, Schedule, TemplateFamily, Weekday } from './types';

/**
 * Which weekdays you train and which session each one gets. The week is a cycle: Sunday and the
 * next Monday are back to back. Sessions on back-to-back days must train different muscles.
 */

/** Spread for "N days a week". */
const SPREADS: Record<number, Weekday[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

export const weekdayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
export const weekdayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function trainingWeekdays(schedule: Schedule): Weekday[] {
  if (schedule.kind === 'count') return SPREADS[Math.min(6, Math.max(2, schedule.days))]!;
  return [...new Set(schedule.weekdays)].sort((a, b) => a - b) as Weekday[];
}

/** Back to back in a weekly cycle (Sun → Mon counts). */
export function backToBack(a: number, b: number): boolean {
  return (b - a + 7) % 7 === 1 || (a - b + 7) % 7 === 1;
}

/** Pairs of training weekdays that are back to back. */
export function backToBackPairs(weekdays: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < weekdays.length; i++) {
    for (let j = i + 1; j < weekdays.length; j++) {
      if (backToBack(weekdays[i]!, weekdays[j]!)) out.push([weekdays[i]!, weekdays[j]!]);
    }
  }
  return out;
}

function valid(weekdays: readonly number[], families: readonly TemplateFamily[]): boolean {
  for (let i = 0; i < weekdays.length; i++) {
    for (let j = i + 1; j < weekdays.length; j++) {
      if (backToBack(weekdays[i]!, weekdays[j]!) && familiesOverlap(families[i]!, families[j]!)) {
        return false;
      }
    }
  }
  return true;
}

/** Orders `keys` over the weekdays so no back-to-back pair overlaps; identity order first. */
function placeKeys(
  weekdays: readonly number[],
  keys: readonly string[],
  templates: Record<string, SessionTemplate>,
): string[] | null {
  const n = keys.length;
  const used: boolean[] = keys.map(() => false);
  const order: string[] = [];
  const families: TemplateFamily[] = [];
  const search = (): boolean => {
    if (order.length === n) return true;
    const pos = order.length;
    for (let k = 0; k < n; k++) {
      if (used[k]) continue;
      const family = templates[keys[k]!]!.family;
      // Against every day already placed (backToBack wraps Sunday to Monday).
      const clash = families.some(
        (f, i) => backToBack(weekdays[i]!, weekdays[pos]!) && familiesOverlap(f, family),
      );
      if (clash) continue;
      used[k] = true;
      order.push(keys[k]!);
      families.push(family);
      if (search()) return true;
      used[k] = false;
      order.pop();
      families.pop();
    }
    return false;
  };
  return search() && valid(weekdays, families) ? order : null;
}

/**
 * Last resort: back-to-back days form runs (the week always has a gap); alternate upper and lower
 * along each run.
 */
function colourKeys(weekdays: readonly number[], alt: { upper: string[]; lower: string[] }) {
  const counters = { upper: 0, lower: 0 };
  // Start each run after a rest day so a run that wraps over Sunday stays alternating.
  const set = new Set(weekdays);
  const start = weekdays.findIndex((d) => !set.has((d + 6) % 7));
  const rotated = [...weekdays.slice(start), ...weekdays.slice(0, start)];
  let prev: number | null = null;
  let colour: 'upper' | 'lower' = 'lower';
  const byDay = new Map<number, string>();
  for (const d of rotated) {
    colour =
      prev !== null && backToBack(prev, d) ? (colour === 'upper' ? 'lower' : 'upper') : 'upper';
    const list = alt[colour];
    byDay.set(d, list[counters[colour]++ % list.length]!);
    prev = d;
  }
  return weekdays.map((d) => byDay.get(d)!);
}

export interface WeekPlan {
  choice: SplitChoice;
  /** True when the first-choice split didn't fit the days and the engine fell back. */
  fellBack: boolean;
  week: { weekday: Weekday; key: string }[];
}

/**
 * `usable` says whether a template can be filled with the lifter's kit (no pull days without a
 * bar); splits that need an unusable template are skipped.
 */
export function planWeek(
  goal: PlanGoal,
  level: PlanLevel,
  weekdays: readonly Weekday[],
  templates: Record<string, SessionTemplate>,
  usable: (key: string) => boolean = () => true,
  minutes = 60,
): WeekPlan {
  const options = splitOptions(goal, level, weekdays.length, minutes);
  for (let i = 0; i < options.length; i++) {
    const choice = options[i]!;
    if (!choice.alternate && !choice.keys.every(usable)) continue;
    const alt = choice.alternate && {
      upper: choice.alternate.upper.filter(usable),
      lower: choice.alternate.lower.filter(usable),
    };
    if (alt && (!alt.upper.length || !alt.lower.length)) continue;
    const keys = alt ? colourKeys(weekdays, alt) : placeKeys(weekdays, choice.keys, templates);
    if (!keys) continue;
    return {
      choice,
      fellBack: i > 0,
      week: weekdays.map((weekday, j) => ({ weekday, key: keys[j]! })),
    };
  }
  throw new Error('No split fits these days.');
}

/** Pairs of dated sessions on consecutive calendar days whose muscles overlap. */
export function consecutiveOverlap(
  days: readonly { date: string; family: TemplateFamily }[],
): [string, string][] {
  const byDate = new Map(days.map((d) => [d.date, d.family]));
  const out: [string, string][] = [];
  for (const d of days) {
    const next = nextDate(d.date);
    const f = byDate.get(next);
    if (f && familiesOverlap(d.family, f)) out.push([d.date, next]);
  }
  return out;
}

function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

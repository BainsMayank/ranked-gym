import type { Goal } from './schema';

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(d.getTime()) && dateKey(d) === value;
}
export function rangeFor(days: number, now = new Date()) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}
export function weekRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  // Offset one week for the comparison explicitly; the dashboard does not use equal-window comparison.
  return { start: start.toISOString(), end: now.toISOString() };
}
export function goalProgress(g: Goal): number {
  if (g.status === 'achieved') return 1;
  if (g.type === 'bodyweight') {
    const distance = g.target_value - g.start_value;
    return distance === 0
      ? 1
      : Math.max(0, Math.min(1, (g.current_value - g.start_value) / distance));
  }
  return Math.max(0, Math.min(1, g.current_value / Math.max(g.target_value, 1)));
}
export function projectedDate(
  points: readonly { at: string; value: number }[],
  target: number,
): string | null {
  if (points.length < 4) return null;
  const origin = Date.parse(points[0]!.at),
    xs = points.map((p) => (Date.parse(p.at) - origin) / 86400000);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length,
    my = points.reduce((a, b) => a + b.value, 0) / xs.length;
  const variance = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (variance === 0 || xs[xs.length - 1]! - xs[0]! < 7) return null;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (points[i]!.value - my), 0) / variance;
  const last = points[points.length - 1]!;
  if (slope === 0 || (target - last.value) / slope <= 0) return null;
  const days = (target - last.value) / slope;
  return days <= 730
    ? new Date(Date.parse(last.at) + days * 86400000).toISOString().slice(0, 10)
    : null;
}
export function bodyweightRate(
  start: number,
  target: number,
  deadline: string,
  now = Date.now(),
): number | null {
  const weeks = (Date.parse(`${deadline}T23:59:59`) - now) / 604800000;
  return weeks > 0 && start > 0 ? Math.abs(target - start) / start / weeks : null;
}
/** Last weigh-in per local calendar day; missing days are not interpolated. */
export function movingAverage(logs: readonly { at: string; kg: number }[]) {
  const latest = new Map<string, { at: string; kg: number }>();
  for (const log of [...logs].sort((a, b) => a.at.localeCompare(b.at)))
    latest.set(dateKey(new Date(log.at)), log);
  const daily = [...latest.values()];
  return daily.map((p) => {
    const first = new Date(p.at);
    first.setHours(0, 0, 0, 0);
    first.setDate(first.getDate() - 6);
    const window = daily.filter((q) => Date.parse(q.at) >= first.getTime() && q.at <= p.at);
    return { x: Date.parse(p.at), y: window.reduce((sum, q) => sum + q.kg, 0) / window.length };
  });
}

export function recordLine(record: { kind: string; value: number; weight_kg?: number | null }) {
  const value = Number(record.value.toFixed(1)).toLocaleString('en-IN');
  const labels: Record<string, string> = {
    e1rm: 'Estimated 1RM',
    weight: 'Heaviest load',
    reps_at_weight: 'Reps',
    set_volume: 'Set volume',
    session_volume: 'Session volume',
    hold: 'Longest hold',
  };
  const unit =
    record.kind === 'hold'
      ? 's'
      : record.kind === 'reps_at_weight'
        ? `reps${record.weight_kg == null ? '' : ` at ${record.weight_kg} kg`}`
        : 'kg';
  return `${labels[record.kind] ?? record.kind.replaceAll('_', ' ')} · ${value} ${unit}`;
}

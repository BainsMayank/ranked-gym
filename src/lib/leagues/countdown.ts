/** Time left in a league week, for the hero countdown ("3d 06h", "5h 20m", "Ending now"). */
export function countdown(endsAt: string, now = Date.now()): string {
  const ms = Date.parse(endsAt) - now;
  if (!Number.isFinite(ms) || ms <= 60_000) return 'Ending now';
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}m`;
  return `${mins}m`;
}

/** Whole days left (rounded up), for "Season 2 · 23 days left". */
export function daysLeft(endsAt: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 86_400_000));
}

/** Dates for history rows, in Indian English ("Tue 7 Oct, 6:12 am"). */
export function formatWorkoutDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time.toLowerCase()}`;
}

/** "October 2026" section headers. */
export function monthOf(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatMinutes(sec: number | null): string {
  if (sec === null) return '';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

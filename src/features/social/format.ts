import type { LogType } from '@/lib/exercises/taxonomy';
import type { BestSet, DiscoverReason, Person, PrMilestone, Visibility } from '@/lib/social';
import { formatDistanceKm, formatDuration } from '@/lib/routines/parse';
import { fromKg, type WeightUnit } from '@/lib/units';
import type { IconName } from '@/components';

/** Pure display helpers for posts. */

export function displayName(p: Pick<Person, 'displayName' | 'username'>): string {
  return p.displayName ?? (p.username ? `@${p.username}` : 'Lifter');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "now", "5m", "3h", "2d", then "12 Oct" (with the year when it isn't this one). */
export function timeAgo(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(0, (now - t) / 1000);
  if (sec < 60) return 'now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d`;
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

/** "1h 05m" / "45 min". */
export function formatSessionLength(sec: number | null): string | null {
  if (sec === null || sec <= 0) return null;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}

/** A best set: "140 × 5", "+20 × 8", "12 reps", "1:30", "2.4 km". */
export function bestSetText(b: BestSet, logType: LogType, unit: WeightUnit): string {
  if (b.distanceM) return `${formatDistanceKm(b.distanceM)} km`;
  if (logType === 'duration' || (b.durationSec !== null && b.reps === null)) {
    return b.durationSec !== null ? formatDuration(b.durationSec) : '';
  }
  if (b.reps === null) return '';
  if (b.weightKg === null || (b.weightKg === 0 && b.weightMode !== 'absolute'))
    return `${b.reps} reps`;
  const sign = b.weightMode === 'bodyweight' ? '+' : b.weightMode === 'assisted' ? '−' : '';
  return `${sign}${fromKg(b.weightKg, unit, 0.25)} × ${b.reps}`;
}

const prKindLabels: Record<string, string> = {
  e1rm: 'Estimated 1RM',
  weight: 'Heaviest weight',
  reps_at_weight: 'Most reps',
  set_volume: 'Best set volume',
  session_volume: 'Session volume',
  hold: 'Longest hold',
};

export const prKindLabel = (kind: string) => prKindLabels[kind] ?? 'Personal record';

/** A record's value in the user's unit: "102.5 kg", "14 reps", "1:05". */
export function prValueText(
  pr: Pick<PrMilestone, 'kind' | 'weightKg'>,
  value: number,
  unit: WeightUnit,
) {
  if (pr.kind === 'reps_at_weight') {
    const at = pr.weightKg ? ` at ${fromKg(pr.weightKg, unit, 0.25)} ${unit}` : '';
    return `${value} reps${at}`;
  }
  if (pr.kind === 'hold') return formatDuration(value);
  const step = pr.kind === 'session_volume' || pr.kind === 'set_volume' ? 1 : 0.25;
  return `${fromKg(value, unit, step).toLocaleString('en-IN')} ${unit}`;
}

export const visibilityIcon: Record<Visibility, IconName> = {
  public: 'globe-outline',
  friends: 'people-outline',
  private: 'lock-closed-outline',
};

export const visibilityWords: Record<Visibility, string> = {
  public: 'Public',
  friends: 'Friends',
  private: 'Only you',
};

export function reasonLabel(r: DiscoverReason, mutual = 0): string {
  switch (r) {
    case 'college':
      return 'Same college';
    case 'city':
      return 'Same city';
    case 'similar_rank':
      return 'Similar rank';
    case 'mutual':
      return mutual === 1 ? '1 mutual friend' : `${mutual} mutual friends`;
  }
}

/** "1 respect" / "12 respects". */
export const respectCount = (n: number) => `${n} ${n === 1 ? 'respect' : 'respects'}`;
export const commentCount = (n: number) => `${n} ${n === 1 ? 'comment' : 'comments'}`;

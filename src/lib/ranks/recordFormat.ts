import type { PrKind } from '@/lib/game/engine/records';
import { formatWeight, type WeightUnit } from '@/lib/units';

import type { RecordEntry } from './records';

/** Grouping and copy for record history (Records tab, exercise detail). Display only. */

export const RECORD_KIND_LABELS: Record<PrKind, string> = {
  e1rm: 'Estimated 1RM',
  weight: 'Heaviest weight',
  reps_at_weight: 'Most reps',
  set_volume: 'Best set volume',
  session_volume: 'Best session volume',
  hold: 'Longest hold',
};

/** "83.1 kg", "12 reps at 60 kg", "12 reps", "45 s". */
export function recordValue(
  r: Pick<RecordEntry, 'kind' | 'value' | 'weightKg'>,
  unit: WeightUnit,
  value = r.value,
): string {
  switch (r.kind) {
    case 'reps_at_weight':
      return r.weightKg
        ? `${value} reps at ${formatWeight(r.weightKg, unit, 0.5)}`
        : `${value} reps`;
    case 'hold':
      return `${value} s`;
    default:
      return formatWeight(value, unit, 0.1);
  }
}

/** The set behind a record: "72.5 kg × 5", "12 reps", "45 s". Null for session volume. */
export function recordSet(r: RecordEntry, unit: WeightUnit): string | null {
  if (!r.set) return null;
  if (r.set.durationSec) return `${r.set.durationSec} s`;
  const reps = r.set.reps ?? 0;
  return r.set.weightKg && r.set.weightKg > 0
    ? `${formatWeight(r.set.weightKg, unit, 0.5)} × ${reps}`
    : `${reps} reps`;
}

export interface RecordGroup {
  exerciseId: string;
  exerciseName: string;
  rankKey: string | null;
  /** The current best of each kind (per weight for reps-at-weight), heaviest first. */
  bests: RecordEntry[];
  /** Records and baselines inside the filter, newest first. */
  history: RecordEntry[];
}

export interface RecordFilter {
  kind: PrKind | 'all';
  /** Only records on or after this ISO instant (null for all time). */
  since: string | null;
}

const KIND_ORDER: PrKind[] = [
  'e1rm',
  'weight',
  'reps_at_weight',
  'set_volume',
  'session_volume',
  'hold',
];

export function groupRecords(entries: readonly RecordEntry[], filter: RecordFilter): RecordGroup[] {
  const byExercise = new Map<string, RecordEntry[]>();
  for (const e of entries)
    byExercise.set(e.exerciseId, [...(byExercise.get(e.exerciseId) ?? []), e]);

  const groups: RecordGroup[] = [];
  for (const list of byExercise.values()) {
    const first = list[0];
    if (!first) continue;
    // Entries arrive oldest first per kind, so the last of each kind (and weight) is the best.
    const latest = new Map<string, RecordEntry>();
    for (const e of [...list].sort((a, b) => a.achievedAt.localeCompare(b.achievedAt))) {
      latest.set(`${e.kind}:${e.weightKg ?? ''}`, e);
    }
    // In the "all" view one "most reps" row (the heaviest weight) is enough; the reps filter lists them all.
    const heaviestReps = Math.max(
      ...[...latest.values()]
        .filter((e) => e.kind === 'reps_at_weight')
        .map((e) => e.weightKg ?? 0),
    );
    const bests = [...latest.values()]
      .filter((e) => filter.kind === 'all' || e.kind === filter.kind)
      .filter(
        (e) =>
          filter.kind !== 'all' ||
          e.kind !== 'reps_at_weight' ||
          (e.weightKg ?? 0) === heaviestReps,
      )
      .sort(
        (a, b) =>
          KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
          (b.weightKg ?? 0) - (a.weightKg ?? 0),
      );
    const history = list
      .filter(
        (e) =>
          (filter.kind === 'all' || e.kind === filter.kind) &&
          (!filter.since || e.achievedAt >= filter.since),
      )
      .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt));
    if (bests.length === 0 || history.length === 0) continue;
    groups.push({
      exerciseId: first.exerciseId,
      exerciseName: first.exerciseName,
      rankKey: first.rankKey,
      bests,
      history,
    });
  }
  // Ranked lifts first, then by name.
  return groups.sort(
    (a, b) =>
      Number(b.rankKey !== null) - Number(a.rankKey !== null) ||
      a.exerciseName.localeCompare(b.exerciseName),
  );
}

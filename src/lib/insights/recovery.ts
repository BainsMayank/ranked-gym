import { muscles, type Muscle } from '@/lib/exercises/taxonomy';

export type RecoverySpeed = 'slower' | 'normal' | 'faster';
export const SPEED = { slower: 1.25, normal: 1, faster: 0.75 } as const;
export const FATIGUE_CAPACITY = 10;
export const READY = 80;

/** Hours; mirrored by public.recovery_half_life. Heuristic, not a physiological measurement. */
export function halfLife(muscle: Muscle): number {
  if (['quads', 'glutes', 'adductors', 'abductors'].includes(muscle)) return 60;
  if (['hamstrings', 'lower_back'].includes(muscle)) return 48;
  if (['upper_chest', 'mid_lower_chest', 'lats', 'upper_back'].includes(muscle)) return 36;
  if (['front_delts', 'side_delts', 'rear_delts', 'traps', 'calves'].includes(muscle)) return 30;
  return 24;
}

export function effortFactor(rir: number | null, rpe: number | null): number {
  const reserve = rir ?? (rpe === null ? 2 : 10 - rpe);
  return Math.max(0.5, Math.min(1.5, 1 + (2 - reserve) * 0.15));
}

export interface FatigueSnapshot {
  muscle: Muscle;
  fatigue: number;
  last_trained: string;
}

export interface FatigueSet {
  at: number;
  rir: number | null;
  rpe: number | null;
  muscles: readonly { muscle: Muscle; weight: number; role: string }[];
}

/** Pure reference calculation, also useful for local unsynced previews. Future sets are ignored. */
export function fatigueFromSets(sets: readonly FatigueSet[], now: number, speed: RecoverySpeed) {
  const out = new Map<Muscle, FatigueSnapshot>();
  for (const set of sets) {
    if (!Number.isFinite(set.at) || set.at > now) continue;
    for (const m of set.muscles) {
      if (m.role === 'stabiliser' || m.weight <= 0) continue;
      const fatigue =
        m.weight *
        effortFactor(set.rir, set.rpe) *
        0.5 ** ((now - set.at) / 3_600_000 / (halfLife(m.muscle) * SPEED[speed]));
      const prev = out.get(m.muscle);
      out.set(m.muscle, {
        muscle: m.muscle,
        fatigue: (prev?.fatigue ?? 0) + fatigue,
        last_trained: new Date(
          Math.max(set.at, prev ? Date.parse(prev.last_trained) : 0),
        ).toISOString(),
      });
    }
  }
  return [...out.values()];
}

/** Advance a server snapshot without fetching history or re-normalising already clamped fatigue. */
export function recoveryNow(
  snapshot: readonly FatigueSnapshot[],
  asOf: number,
  now: number,
  speed: RecoverySpeed,
) {
  return muscles
    .filter((m) => m !== 'neck')
    .map((muscle) => {
      const row = snapshot.find((s) => s.muscle === muscle);
      const fatigue =
        (row?.fatigue ?? 0) *
        0.5 ** (Math.max(0, now - asOf) / 3_600_000 / (halfLife(muscle) * SPEED[speed]));
      return {
        muscle,
        percent: Math.max(0, Math.min(100, 100 * (1 - fatigue / FATIGUE_CAPACITY))),
        lastTrained: row?.last_trained ?? null,
        ready: fatigue <= FATIGUE_CAPACITY * (1 - READY / 100),
      };
    })
    .sort((a, b) => a.percent - b.percent);
}

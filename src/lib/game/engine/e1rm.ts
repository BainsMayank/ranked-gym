/**
 * Estimated 1RM for ranks (docs/RANK_SYSTEM.md §4). Mirrors `public.rank_e1rm` in Postgres.
 *
 * - 1 rep: the load itself.
 * - 2–10 reps: the average of Epley and Brzycki. Epley runs high and Brzycki low as reps rise; the
 *   average stays close to tested maxes up to about 10 reps.
 * - Above 10 reps: no estimate. Those sets still count for reps-based standards and records.
 */

export const MIN_RANK_REPS = 1;
export const MAX_RANK_REPS = 10;

export function epley(loadKg: number, reps: number): number {
  return loadKg * (1 + reps / 30);
}

export function brzycki(loadKg: number, reps: number): number {
  return (loadKg * 36) / (37 - reps);
}

/** e1RM ÷ load for a set of this many reps (1 for a single). */
export function repFactor(reps: number): number {
  if (reps === 1) return 1;
  return (1 + reps / 30 + 36 / (37 - reps)) / 2;
}

/** The rank e1RM, or null when the set can't give one (no load, or reps outside 1–10). */
export function rankE1rm(loadKg: number | null, reps: number | null): number | null {
  if (loadKg === null || reps === null || !(loadKg > 0) || !Number.isFinite(loadKg)) return null;
  if (!Number.isInteger(reps) || reps < MIN_RANK_REPS || reps > MAX_RANK_REPS) return null;
  return loadKg * repFactor(reps);
}

/** The load that gives this e1RM at this many reps (inverse of rankE1rm). */
export function loadForE1rm(e1rm: number, reps: number): number {
  return e1rm / repFactor(reps);
}

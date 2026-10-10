import type { Exercise, ExerciseMuscle } from '@/lib/exercises/types';
import type { Muscle } from '@/lib/exercises/taxonomy';

import { ladderPosition, type RankLadder } from './ladder';

/**
 * How a muscle's rank is made up, for the body map's muscle sheet. Display only: the server
 * computes the muscle score (RANK_SYSTEM.md §9: a weighted average of the lift scores that train
 * it, primary 1, secondary 0.5 or 0.25); this splits it back into its lifts with the same weights.
 */

/** Muscles each rank key trains, from the official library (stabilisers don't count). */
export type LiftMuscleMap = Record<string, readonly ExerciseMuscle[]>;

export function liftMusclesFromLibrary(exercises: readonly Exercise[]): LiftMuscleMap {
  const out: Record<string, ExerciseMuscle[]> = {};
  for (const e of exercises) {
    if (e.createdBy !== null || !e.rankKey) continue;
    out[e.rankKey] = e.muscles.filter((m) => m.role !== 'stabiliser');
  }
  return out;
}

export interface MuscleContribution {
  rankKey: string;
  weight: number;
  /** Share of the muscle's score (0–1). */
  share: number;
  score: number;
}

export type WeakestLink =
  /** A ranked lift that would raise the muscle most if it moved up a division. */
  | { kind: 'raise'; rankKey: string; score: number; nextScore: number; gain: number }
  /** Nothing ranks this muscle yet: the lift that trains it most. */
  | { kind: 'unlock'; rankKey: string };

export interface MuscleBreakdown {
  contributions: MuscleContribution[];
  weakestLink: WeakestLink | null;
}

export function muscleBreakdown(
  muscle: Muscle,
  liftScores: ReadonlyMap<string, number>,
  liftMuscles: LiftMuscleMap,
  ladder: RankLadder | undefined,
): MuscleBreakdown {
  const trained: { rankKey: string; weight: number; primary: boolean }[] = [];
  for (const [rankKey, list] of Object.entries(liftMuscles)) {
    const m = list.find((x) => x.muscle === muscle);
    if (m) trained.push({ rankKey, weight: m.weight, primary: m.role === 'primary' });
  }

  const ranked = trained.filter((t) => liftScores.has(t.rankKey));
  const total = ranked.reduce((sum, t) => sum + t.weight, 0);
  const contributions = ranked
    .map((t) => ({
      rankKey: t.rankKey,
      weight: t.weight,
      share: total > 0 ? t.weight / total : 0,
      score: liftScores.get(t.rankKey) ?? 0,
    }))
    .sort((a, b) => b.share * b.score - a.share * a.score);

  if (contributions.length === 0) {
    const best = [...trained].sort(
      (a, b) =>
        Number(b.primary) - Number(a.primary) ||
        b.weight - a.weight ||
        a.rankKey.localeCompare(b.rankKey),
    )[0];
    return { contributions, weakestLink: best ? { kind: 'unlock', rankKey: best.rankKey } : null };
  }
  if (!ladder) return { contributions, weakestLink: null };

  // The lift whose next division adds the most to this muscle; low scorers with a big share win.
  // A lift below the muscle's average also counts what it drags the muscle down by.
  const average = contributions.reduce((sum, x) => sum + x.share * x.score, 0);
  let link: WeakestLink | null = null;
  let bestPriority = -1;
  for (const c of contributions) {
    const { nextScore } = ladderPosition(c.score, ladder);
    if (nextScore === null) continue;
    const gain = c.share * (nextScore - c.score);
    const priority = gain + c.share * Math.max(0, average - c.score);
    if (priority > bestPriority) {
      bestPriority = priority;
      link = { kind: 'raise', rankKey: c.rankKey, score: c.score, nextScore, gain };
    }
  }
  return { contributions, weakestLink: link };
}

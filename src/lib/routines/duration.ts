import { setClusters } from './setRules';
import type { RoutineExercise, RoutineSet } from './types';

/**
 * Estimated routine length. Deliberately simple and explainable:
 *
 * - Work: reps (a range uses its midpoint) × seconds per rep (the tempo's sum, else 3 s), or the
 *   set's duration, or its distance at 6 min/km.
 * - Rest after every set except the very last one: the exercise's rest, capped at 60 s after a
 *   warm-up; a drop set follows its parent after 10 s.
 * - Supersets run in rounds: each member's next cluster in turn, with the member's own rest
 *   (usually 0) plus 15 s to move, then the round rest.
 * - 60 s of setup per exercise. Rounded to the nearest 5 minutes.
 */

export const DURATION_MODEL = {
  secPerRep: 3,
  setupSec: 60,
  warmupRestCapSec: 60,
  dropRestSec: 10,
  supersetMoveSec: 15,
  secPerMetre: 0.36,
} as const;

/** Seconds per rep from a tempo like '3-1-1-0' (X counts as 1 s). */
export function secondsPerRep(tempo: string | null): number {
  if (!tempo) return DURATION_MODEL.secPerRep;
  const total = tempo
    .split('-')
    .reduce((sum, part) => sum + (part.toUpperCase() === 'X' ? 1 : Number(part) || 0), 0);
  return Math.max(1, total);
}

/** Planned reps for a set (range midpoint), or 0 for timed and distance sets. */
export function plannedReps(set: RoutineSet): number {
  if (set.targetType === 'reps') return set.reps ?? 0;
  if (set.targetType === 'rep_range') return ((set.repsMin ?? 0) + (set.repsMax ?? 0)) / 2;
  return 0;
}

export function workSeconds(set: RoutineSet): number {
  switch (set.targetType) {
    case 'duration':
      return set.durationSec ?? 0;
    case 'distance':
      return (set.distanceM ?? 0) * DURATION_MODEL.secPerMetre;
    default:
      return plannedReps(set) * secondsPerRep(set.tempo);
  }
}

/** Work time of a cluster (a set and its drop sets) including the short gaps before drops. */
function clusterSeconds(cluster: RoutineSet[]): number {
  return cluster.reduce(
    (sum, s, i) => sum + workSeconds(s) + (i > 0 ? DURATION_MODEL.dropRestSec : 0),
    0,
  );
}

function restAfterCluster(cluster: RoutineSet[], restSeconds: number): number {
  return cluster[0]!.setType === 'warmup'
    ? Math.min(restSeconds, DURATION_MODEL.warmupRestCapSec)
    : restSeconds;
}

/** Blocks of exercises: single exercises, or consecutive members of one superset. */
function blocks(exercises: readonly RoutineExercise[]): RoutineExercise[][] {
  const out: RoutineExercise[][] = [];
  for (const e of exercises) {
    const last = out[out.length - 1];
    const lastGroup = last?.[0]?.supersetGroup ?? null;
    if (last && e.supersetGroup !== null && e.supersetGroup === lastGroup) last.push(e);
    else out.push([e]);
  }
  return out;
}

/** Timeline of [work, rest] seconds in the order the sets are done. */
function timeline(exercises: readonly RoutineExercise[]): { work: number; rest: number }[] {
  const steps: { work: number; rest: number }[] = [];
  for (const block of blocks(exercises)) {
    if (block.length === 1) {
      const e = block[0]!;
      for (const c of setClusters(e.sets)) {
        steps.push({ work: clusterSeconds(c), rest: restAfterCluster(c, e.restSeconds) });
      }
      continue;
    }
    const perMember = block.map((e) => setClusters(e.sets));
    const rounds = Math.max(...perMember.map((c) => c.length));
    const roundRest = block[0]!.restAfterSupersetSeconds ?? block[block.length - 1]!.restSeconds;
    for (let r = 0; r < rounds; r++) {
      const inRound = block
        .map((e, m) => ({ e, c: perMember[m]![r] }))
        .filter((x): x is { e: RoutineExercise; c: RoutineSet[] } => !!x.c);
      inRound.forEach(({ e, c }, k) => {
        const lastInRound = k === inRound.length - 1;
        const rest = lastInRound
          ? restAfterCluster(c, roundRest)
          : e.restSeconds + DURATION_MODEL.supersetMoveSec;
        steps.push({ work: clusterSeconds(c), rest });
      });
    }
  }
  return steps;
}

/** Estimated total in seconds (unrounded). */
export function estimateDurationSec(exercises: readonly RoutineExercise[]): number {
  const steps = timeline(exercises);
  if (steps.length === 0) return 0;
  const setup = exercises.filter((e) => e.sets.length > 0).length * DURATION_MODEL.setupSec;
  const total = steps.reduce((sum, s) => sum + s.work + s.rest, 0) - steps[steps.length - 1]!.rest;
  return total + setup;
}

/** Estimated minutes, rounded to 5 (at least 5 when there is any set). */
export function estimateDurationMin(exercises: readonly RoutineExercise[]): number {
  const sec = estimateDurationSec(exercises);
  if (sec === 0) return 0;
  return Math.max(5, Math.round(sec / 300) * 5);
}

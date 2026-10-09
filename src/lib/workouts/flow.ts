import type { WorkoutExercise } from './types';

/**
 * What happens after a set is ticked: where focus goes next and how long to rest.
 *
 * - Single exercise: rest the exercise's rest (a warm-up rests at most 60 s, and a drop set
 *   follows straight on), then its next open set.
 * - Superset (A1, A2…): after A1's set n, go to A2's set n with the member's own rest (usually
 *   none); after the last member of the round, rest the round rest and go back to A1's next set.
 * - The very last open set of the workout starts no rest.
 */

export interface SetRef {
  exerciseId: string;
  setId: string;
}

export interface AfterSet {
  restSec: number;
  next: SetRef | null;
}

const WARMUP_REST_CAP_SEC = 60;

/** Indexes of the exercises in the same superset block as `index` (just itself when single). */
function blockOf(exercises: readonly WorkoutExercise[], index: number): number[] {
  const group = exercises[index]?.supersetGroup ?? null;
  if (group === null) return [index];
  let start = index;
  while (start > 0 && exercises[start - 1]!.supersetGroup === group) start--;
  let end = index;
  while (end < exercises.length - 1 && exercises[end + 1]!.supersetGroup === group) end++;
  return Array.from({ length: end - start + 1 }, (_, k) => start + k);
}

/** The first set not yet done, scanning exercises from `fromIndex` (wrapping to the start). */
export function firstOpenSet(exercises: readonly WorkoutExercise[], fromIndex = 0): SetRef | null {
  for (let k = 0; k < exercises.length; k++) {
    const e = exercises[(fromIndex + k) % exercises.length]!;
    const s = e.sets.find((x) => !x.completed);
    if (s) return { exerciseId: e.id, setId: s.id };
  }
  return null;
}

/** Called with the workout after the set was ticked. */
export function afterSet(exercises: readonly WorkoutExercise[], done: SetRef): AfterSet {
  const ei = exercises.findIndex((e) => e.id === done.exerciseId);
  const exercise = exercises[ei];
  if (!exercise) return { restSec: 0, next: firstOpenSet(exercises) };
  const si = exercise.sets.findIndex((s) => s.id === done.setId);
  const set = exercise.sets[si];
  const anyOpen = firstOpenSet(exercises);
  if (!set || !anyOpen) return { restSec: 0, next: anyOpen };

  const block = blockOf(exercises, ei);
  if (block.length === 1) {
    const following = exercise.sets[si + 1];
    const open = exercise.sets.slice(si + 1).find((s) => !s.completed);
    const next = open
      ? { exerciseId: exercise.id, setId: open.id }
      : firstOpenSet(exercises, ei + 1);
    let restSec = exercise.restSeconds;
    if (set.setType === 'warmup') restSec = Math.min(restSec, WARMUP_REST_CAP_SEC);
    if (following?.setType === 'drop') restSec = 0;
    return { restSec, next };
  }

  // Superset: the next member in this round that still has an open set at this position.
  const pos = block.indexOf(ei);
  for (let k = pos + 1; k < block.length; k++) {
    const member = exercises[block[k]!]!;
    const s = member.sets[si];
    if (s && !s.completed) {
      return { restSec: exercise.restSeconds, next: { exerciseId: member.id, setId: s.id } };
    }
  }
  // End of the round: back to the first member with an open set in a later round.
  const roundRest = exercise.restAfterSupersetSeconds ?? exercise.restSeconds;
  for (let round = si + 1; ; round++) {
    let any = false;
    for (const m of block) {
      const s = exercises[m]!.sets[round];
      if (!s) continue;
      any = true;
      if (!s.completed) {
        return { restSec: roundRest, next: { exerciseId: exercises[m]!.id, setId: s.id } };
      }
    }
    if (!any) break;
  }
  // Superset finished (or only earlier rounds left open): rest, then whatever is still open.
  const lastInBlock = block[block.length - 1]!;
  return { restSec: roundRest, next: firstOpenSet(exercises, lastInBlock + 1) };
}

/** "Bench press, set 3" for the rest sheet and notification. */
export function describeSet(
  exercises: readonly WorkoutExercise[],
  ref: SetRef | null,
  nameOf: (exerciseId: string) => string,
): string | null {
  if (!ref) return null;
  const e = exercises.find((x) => x.id === ref.exerciseId);
  if (!e) return null;
  const n = e.sets.findIndex((s) => s.id === ref.setId) + 1;
  return `${nameOf(e.exerciseId)}, set ${n}`;
}

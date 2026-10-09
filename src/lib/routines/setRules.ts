import { setTypeInfo, type SetType } from './taxonomy';
import type { RoutineExercise, RoutineSet } from './types';

/**
 * Set-type rules shared by the builder, live logging and (mirrored in SQL) the rank engine:
 *
 * - Warm-ups never count: not in working-set counts, volume, muscle totals or ranking.
 * - Every other type (working, top, back-off, drop, failure, AMRAP) is a working set.
 * - A drop set belongs to the nearest earlier non-drop set, so it can never come first.
 * - Working sets are numbered 1, 2, 3…; the other types show a letter.
 */

export function isWorkingSet(set: { setType: SetType }): boolean {
  return set.setType !== 'warmup';
}

export function countWorkingSets(sets: readonly { setType: SetType }[]): number {
  return sets.reduce((n, s) => n + (isWorkingSet(s) ? 1 : 0), 0);
}

/** Badge text for each set: W, 1, 2, T, B, D, F, A. */
export function setMarks(sets: readonly { setType: SetType }[]): string[] {
  let n = 0;
  return sets.map((s) => (s.setType === 'working' ? String(++n) : setTypeInfo[s.setType].mark));
}

/** Index of the set a drop set hangs off, or null when the set isn't a drop set. */
export function dropParentIndex(
  sets: readonly { setType: SetType }[],
  index: number,
): number | null {
  if (sets[index]?.setType !== 'drop') return null;
  for (let i = index - 1; i >= 0; i--) if (sets[i]!.setType !== 'drop') return i;
  return null;
}

/** Splits sets into clusters: one non-drop set plus the drop sets that follow it. */
export function setClusters<T extends { setType: SetType }>(sets: readonly T[]): T[][] {
  const out: T[][] = [];
  for (const s of sets) {
    const last = out[out.length - 1];
    if (s.setType === 'drop' && last) last.push(s);
    else out.push([s]);
  }
  return out;
}

/** A leading drop set has no parent, so it becomes a working set. */
export function fixLeadingDrop<S extends { setType: SetType }>(sets: S[]): S[] {
  const first = sets[0];
  if (first?.setType !== 'drop') return sets;
  return [{ ...first, setType: 'working' }, ...sets.slice(1)];
}

/** The set a percent-of-top-set load refers to: the last top set before `index`. */
export function topSetBefore(sets: readonly RoutineSet[], index: number): RoutineSet | null {
  for (let i = index - 1; i >= 0; i--) if (sets[i]!.setType === 'top') return sets[i]!;
  return null;
}

export interface SupersetPosition {
  /** A, B, C… in routine order. */
  letter: string;
  /** 1-based place in the superset (A1, A2…). */
  index: number;
  size: number;
  first: boolean;
  last: boolean;
}

/** A1/A2/A3 labels for exercises in supersets (null for single exercises). */
export function supersetPositions(
  exercises: readonly Pick<RoutineExercise, 'supersetGroup'>[],
): (SupersetPosition | null)[] {
  const out: (SupersetPosition | null)[] = exercises.map(() => null);
  let letter = 0;
  let i = 0;
  while (i < exercises.length) {
    const group = exercises[i]!.supersetGroup;
    let j = i + 1;
    while (group !== null && j < exercises.length && exercises[j]!.supersetGroup === group) j++;
    const size = j - i;
    if (group !== null && size > 1) {
      const l = String.fromCharCode(65 + (letter++ % 26));
      for (let k = i; k < j; k++) {
        out[k] = { letter: l, index: k - i + 1, size, first: k === i, last: k === j - 1 };
      }
    }
    i = j;
  }
  return out;
}

/**
 * Keeps supersets valid after any edit: a group survives only while its members sit next to each
 * other; a group of one dissolves; groups are renumbered 1, 2, 3 in order; the rest after a round is
 * the same on every member. Unchanged exercises keep their identity (cheap re-renders).
 */
export function normaliseSupersets<
  E extends Pick<RoutineExercise, 'supersetGroup' | 'restSeconds' | 'restAfterSupersetSeconds'>,
>(exercises: E[]): E[] {
  const out = exercises.slice();
  let next = 1;
  let i = 0;
  while (i < out.length) {
    const group = out[i]!.supersetGroup;
    let j = i + 1;
    while (group !== null && j < out.length && out[j]!.supersetGroup === group) j++;
    if (group === null || j - i === 1) {
      const e = out[i]!;
      if (e.supersetGroup !== null || e.restAfterSupersetSeconds !== null) {
        out[i] = { ...e, supersetGroup: null, restAfterSupersetSeconds: null };
      }
    } else {
      const members = out.slice(i, j);
      const roundRest =
        members.find((m) => m.restAfterSupersetSeconds !== null)?.restAfterSupersetSeconds ??
        members[members.length - 1]!.restSeconds;
      const id = next++;
      for (let k = i; k < j; k++) {
        const e = out[k]!;
        if (e.supersetGroup !== id || e.restAfterSupersetSeconds !== roundRest) {
          out[k] = { ...e, supersetGroup: id, restAfterSupersetSeconds: roundRest };
        }
      }
    }
    i = j;
  }
  return out.every((e, k) => e === exercises[k]) ? exercises : out;
}

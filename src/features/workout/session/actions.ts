import type { Exercise } from '@/lib/exercises';
import {
  defaultWeightMode,
  fixLeadingDrop,
  normaliseSupersets,
  type EffortMetric,
  type SetType,
} from '@/lib/routines';
import {
  completeSet,
  exerciseFromLibrary,
  nextSet,
  uncompleteSet,
  type Suggestion,
  type WorkoutDoc,
  type WorkoutExercise,
  type WorkoutSet,
} from '@/lib/workouts';

/**
 * Pure edits on the workout being logged. Each returns a new document (untouched exercises keep
 * their identity, so only the changed card re-renders) and keeps supersets valid.
 */

type Doc = WorkoutDoc;
type NewId = () => string;

function withExercises(doc: Doc, exercises: WorkoutExercise[]): Doc {
  return { ...doc, exercises: normaliseSupersets(exercises) };
}

function mapExercise(doc: Doc, id: string, fn: (e: WorkoutExercise) => WorkoutExercise): Doc {
  return withExercises(
    doc,
    doc.exercises.map((e) => (e.id === id ? fn(e) : e)),
  );
}

function mapSet(doc: Doc, exerciseId: string, setId: string, fn: (s: WorkoutSet) => WorkoutSet) {
  return mapExercise(doc, exerciseId, (e) => ({
    ...e,
    sets: fixLeadingDrop(e.sets.map((s) => (s.id === setId ? fn(s) : s))),
  }));
}

export function renameWorkout(doc: Doc, name: string): Doc {
  const trimmed = name.trim().slice(0, 60);
  return trimmed && trimmed !== doc.name ? { ...doc, name: trimmed } : doc;
}

export function updateSet(doc: Doc, exerciseId: string, setId: string, patch: Partial<WorkoutSet>) {
  return mapSet(doc, exerciseId, setId, (s) => ({ ...s, ...patch }));
}

/** Ticks a set (empty values take the suggestion) or unticks it. */
export function toggleSet(
  doc: Doc,
  exerciseId: string,
  setId: string,
  suggestion: Suggestion,
  now: string,
): Doc {
  return mapSet(doc, exerciseId, setId, (s) =>
    s.completed ? uncompleteSet(s) : completeSet(s, suggestion, now),
  );
}

/** Marks a set as attempted and missed (it counts as done), or clears the flag. */
export function toggleFailed(
  doc: Doc,
  exerciseId: string,
  setId: string,
  suggestion: Suggestion,
  now: string,
): Doc {
  return mapSet(doc, exerciseId, setId, (s) =>
    s.failed ? { ...s, failed: false } : { ...completeSet(s, suggestion, now), failed: true },
  );
}

export function setSetType(doc: Doc, exerciseId: string, setId: string, setType: SetType): Doc {
  return mapSet(doc, exerciseId, setId, (s) => ({ ...s, setType }));
}

export function addSet(
  doc: Doc,
  exerciseId: string,
  logType: Exercise['logType'],
  newId: NewId,
): Doc {
  return mapExercise(doc, exerciseId, (e) => ({
    ...e,
    sets: [...e.sets, nextSet(e.sets, newId(), logType)],
  }));
}

export function deleteSet(doc: Doc, exerciseId: string, setId: string): Doc {
  return mapExercise(doc, exerciseId, (e) => ({
    ...e,
    sets: fixLeadingDrop(e.sets.filter((s) => s.id !== setId)),
  }));
}

export function addExercises(
  doc: Doc,
  picked: readonly Pick<Exercise, 'id' | 'mechanic' | 'logType'>[],
  newId: NewId,
  effort: EffortMetric,
  defaultRestSec?: number,
): Doc {
  return withExercises(doc, [
    ...doc.exercises,
    ...picked.map((e) => exerciseFromLibrary(e, newId, effort, defaultRestSec)),
  ]);
}

/**
 * Swaps the library exercise and keeps the sets. When the load works differently (barbell to
 * bodyweight), weights that weren't lifted yet are cleared.
 */
export function replaceExercise(
  doc: Doc,
  exerciseId: string,
  next: Pick<Exercise, 'id' | 'logType'>,
): Doc {
  const mode = defaultWeightMode(next.logType);
  return mapExercise(doc, exerciseId, (e) => ({
    ...e,
    exerciseId: next.id,
    sets: e.sets.map((s) =>
      s.weightMode === mode || s.completed
        ? s
        : { ...s, weightMode: mode, weightKg: null, targetWeightKg: null },
    ),
  }));
}

export function removeExercise(doc: Doc, exerciseId: string): Doc {
  return withExercises(
    doc,
    doc.exercises.filter((e) => e.id !== exerciseId),
  );
}

export function reorderExercises(doc: Doc, ids: readonly string[]): Doc {
  const byId = new Map(doc.exercises.map((e) => [e.id, e]));
  const list = ids.map((id) => byId.get(id)).filter((e): e is WorkoutExercise => !!e);
  if (list.length !== doc.exercises.length) return doc;
  return withExercises(doc, list);
}

export function updateExercise(
  doc: Doc,
  exerciseId: string,
  patch: Partial<Pick<WorkoutExercise, 'notes' | 'restSeconds'>>,
): Doc {
  return mapExercise(doc, exerciseId, (e) => ({ ...e, ...patch }));
}

function nextGroup(exercises: readonly WorkoutExercise[]): number {
  return exercises.reduce((max, e) => Math.max(max, e.supersetGroup ?? 0), 0) + 1;
}

/** Joins the next exercise into this one's superset (or starts one with it). */
export function supersetWithNext(doc: Doc, exerciseId: string): Doc {
  const i = doc.exercises.findIndex((e) => e.id === exerciseId);
  const current = doc.exercises[i];
  const next = doc.exercises[i + 1];
  if (!current || !next) return doc;
  const group = current.supersetGroup ?? next.supersetGroup ?? nextGroup(doc.exercises);
  const roundRest = current.restAfterSupersetSeconds ?? next.restSeconds;
  return withExercises(
    doc,
    doc.exercises.map((e, k) => {
      const inNextGroup = next.supersetGroup !== null && e.supersetGroup === next.supersetGroup;
      if (k !== i && k !== i + 1 && !inNextGroup) return e;
      return {
        ...e,
        supersetGroup: group,
        restSeconds: k === i ? 0 : e.restSeconds,
        restAfterSupersetSeconds: roundRest,
      };
    }),
  );
}

/** Takes an exercise out of its superset and places it straight after the group. */
export function removeFromSuperset(doc: Doc, exerciseId: string): Doc {
  const i = doc.exercises.findIndex((e) => e.id === exerciseId);
  const e = doc.exercises[i];
  if (!e || e.supersetGroup === null) return doc;
  let last = i;
  while (doc.exercises[last + 1]?.supersetGroup === e.supersetGroup) last++;
  const freed: WorkoutExercise = {
    ...e,
    supersetGroup: null,
    restSeconds: e.restAfterSupersetSeconds ?? e.restSeconds,
    restAfterSupersetSeconds: null,
  };
  const list = doc.exercises.slice();
  list.splice(i, 1);
  list.splice(last, 0, freed);
  return withExercises(doc, list);
}

/** Unticked sets, for the finish check. */
export function openSetCount(doc: Doc): number {
  return doc.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.completed).length, 0);
}

/** Drops sets that were never ticked (and exercises left with none) when finishing. */
export function dropOpenSets(doc: Doc): Doc {
  return withExercises(
    doc,
    doc.exercises
      .map((e) => ({ ...e, sets: fixLeadingDrop(e.sets.filter((s) => s.completed)) }))
      .filter((e) => e.sets.length > 0),
  );
}

export function moveExercise(doc: Doc, from: number, to: number): Doc {
  if (from === to || to < 0 || to >= doc.exercises.length) return doc;
  const list = doc.exercises.slice();
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item!);
  return withExercises(doc, list);
}

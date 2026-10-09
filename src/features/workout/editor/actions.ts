import {
  fixLeadingDrop,
  newRoutineExercise,
  normaliseSupersets,
  remapSets,
  type EffortMetric,
  type RoutineDoc,
  type RoutineExercise,
  type RoutineSet,
} from '@/lib/routines';
import type { Exercise } from '@/lib/exercises';

/**
 * Pure edits on a routine document. The store wraps each in undo history; every result keeps
 * supersets valid (normaliseSupersets) so no edit can leave a broken group behind.
 */

type NewId = () => string;
type Doc = RoutineDoc;

function withExercises(doc: Doc, exercises: RoutineExercise[]): Doc {
  return { ...doc, exercises: normaliseSupersets(exercises) };
}

function mapExercise(doc: Doc, id: string, fn: (e: RoutineExercise) => RoutineExercise): Doc {
  return withExercises(
    doc,
    doc.exercises.map((e) => (e.id === id ? fn(e) : e)),
  );
}

function nextGroup(exercises: readonly RoutineExercise[]): number {
  return exercises.reduce((max, e) => Math.max(max, e.supersetGroup ?? 0), 0) + 1;
}

export function addExercises(
  doc: Doc,
  picked: readonly Pick<Exercise, 'id' | 'mechanic' | 'logType'>[],
  newId: NewId,
  effort: EffortMetric,
  userDefaultRestSec?: number,
): Doc {
  return withExercises(doc, [
    ...doc.exercises,
    ...picked.map((e) => newRoutineExercise(e, newId, effort, userDefaultRestSec)),
  ]);
}

export function removeExercise(doc: Doc, id: string): Doc {
  return withExercises(
    doc,
    doc.exercises.filter((e) => e.id !== id),
  );
}

export function duplicateExercise(doc: Doc, id: string, newId: NewId): Doc {
  const i = doc.exercises.findIndex((e) => e.id === id);
  if (i < 0) return doc;
  const src = doc.exercises[i]!;
  const copy: RoutineExercise = {
    ...src,
    id: newId(),
    supersetGroup: null,
    restAfterSupersetSeconds: null,
    sets: src.sets.map((s) => ({ ...s, id: newId() })),
  };
  // Place the copy after the source's whole superset so the group stays intact.
  let at = i + 1;
  while (
    src.supersetGroup !== null &&
    at < doc.exercises.length &&
    doc.exercises[at]!.supersetGroup === src.supersetGroup
  ) {
    at++;
  }
  const list = doc.exercises.slice();
  list.splice(at, 0, copy);
  return withExercises(doc, list);
}

/** Swaps the library exercise and keeps the sets (columns follow the new log type). */
export function replaceExercise(
  doc: Doc,
  id: string,
  next: Pick<Exercise, 'id' | 'logType'>,
  fromLogType: Exercise['logType'],
  effort: EffortMetric,
): Doc {
  return mapExercise(doc, id, (e) => ({
    ...e,
    exerciseId: next.id,
    sets: remapSets(e.sets, fromLogType, next.logType, effort),
  }));
}

export function moveExercise(doc: Doc, from: number, to: number): Doc {
  if (from === to || to < 0 || to >= doc.exercises.length) return doc;
  const list = doc.exercises.slice();
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item!);
  return withExercises(doc, list);
}

/**
 * Links the selected exercises into one superset: they gather at the first one's place in their
 * current order, move between members without rest, and share the last member's rest per round.
 */
export function makeSuperset(doc: Doc, ids: readonly string[]): Doc {
  const selected = doc.exercises.filter((e) => ids.includes(e.id));
  if (selected.length < 2) return doc;
  const first = doc.exercises.findIndex((e) => ids.includes(e.id));
  const group = nextGroup(doc.exercises);
  const roundRest = selected[selected.length - 1]!.restSeconds;
  const members = selected.map((e) => ({
    ...e,
    supersetGroup: group,
    restSeconds: 0,
    restAfterSupersetSeconds: roundRest,
  }));
  const rest = doc.exercises.filter((e) => !ids.includes(e.id));
  const before = doc.exercises.slice(0, first).filter((e) => !ids.includes(e.id)).length;
  // Members of other groups that end up split are tidied by normaliseSupersets.
  return withExercises(doc, [...rest.slice(0, before), ...members, ...rest.slice(before)]);
}

/** Joins the next exercise into this one's superset (or starts one with it). */
export function supersetWithNext(doc: Doc, id: string): Doc {
  const i = doc.exercises.findIndex((e) => e.id === id);
  const current = doc.exercises[i];
  const next = doc.exercises[i + 1];
  if (!current || !next) return doc;
  const group = current.supersetGroup ?? next.supersetGroup ?? nextGroup(doc.exercises);
  const roundRest = current.restAfterSupersetSeconds ?? next.restSeconds;
  return withExercises(
    doc,
    doc.exercises.map((e, k) => {
      const inNextGroup = next.supersetGroup !== null && e.supersetGroup === next.supersetGroup;
      if (k === i || k === i + 1 || inNextGroup) {
        return {
          ...e,
          supersetGroup: group,
          restSeconds: k === i ? 0 : e.restSeconds,
          restAfterSupersetSeconds: roundRest,
        };
      }
      return e;
    }),
  );
}

/** Takes an exercise out of its superset and places it straight after the group. */
export function removeFromSuperset(doc: Doc, id: string): Doc {
  const i = doc.exercises.findIndex((e) => e.id === id);
  const e = doc.exercises[i];
  if (!e || e.supersetGroup === null) return doc;
  let last = i;
  while (doc.exercises[last + 1]?.supersetGroup === e.supersetGroup) last++;
  const freed: RoutineExercise = {
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

/** Adds a set copying the last one (a copied top set becomes a back-off set). */
export function addSet(doc: Doc, exerciseId: string, make: () => RoutineSet, newId: NewId): Doc {
  return mapExercise(doc, exerciseId, (e) => {
    const last = e.sets[e.sets.length - 1];
    const set: RoutineSet = last
      ? { ...last, id: newId(), setType: last.setType === 'top' ? 'backoff' : last.setType }
      : make();
    return { ...e, sets: [...e.sets, set] };
  });
}

export function deleteSet(doc: Doc, exerciseId: string, setId: string): Doc {
  return mapExercise(doc, exerciseId, (e) => ({
    ...e,
    sets: fixLeadingDrop(e.sets.filter((s) => s.id !== setId)),
  }));
}

export function updateSet(
  doc: Doc,
  exerciseId: string,
  setId: string,
  patch: Partial<RoutineSet>,
): Doc {
  return mapExercise(doc, exerciseId, (e) => ({
    ...e,
    sets: fixLeadingDrop(e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s))),
  }));
}

export function updateExercise(
  doc: Doc,
  exerciseId: string,
  patch: Partial<Pick<RoutineExercise, 'restSeconds' | 'notes' | 'sets'>>,
): Doc {
  return mapExercise(doc, exerciseId, (e) => ({ ...e, ...patch }));
}

/** Sets the rest after a round on every member of the exercise's superset. */
export function setRoundRest(doc: Doc, exerciseId: string, seconds: number): Doc {
  const group = doc.exercises.find((e) => e.id === exerciseId)?.supersetGroup ?? null;
  if (group === null) return doc;
  return withExercises(
    doc,
    doc.exercises.map((e) =>
      e.supersetGroup === group ? { ...e, restAfterSupersetSeconds: seconds } : e,
    ),
  );
}

export type DocMeta = Partial<Pick<Doc, 'name' | 'description' | 'colour' | 'folderId'>>;

export function updateMeta(doc: Doc, patch: DocMeta): Doc {
  return { ...doc, ...patch };
}

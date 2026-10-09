import { blankRoutine, supersetPositions, type RoutineDoc } from '@/lib/routines';
import { exercise, set, testId } from '@/lib/routines/__fixtures__/routine';

import {
  addExercises,
  duplicateExercise,
  makeSuperset,
  moveExercise,
  removeExercise,
  removeFromSuperset,
  replaceExercise,
  supersetWithNext,
} from '../actions';
import { UNDO_LIMIT, editRoutine, selectDirty, useRoutineEditor } from '../store';

function doc(n: number): RoutineDoc {
  return {
    ...blankRoutine('r', 'now'),
    name: 'Test',
    exercises: Array.from({ length: n }, (_, i) =>
      exercise({ id: `e${i + 1}`, exerciseId: `x${i + 1}`, restSeconds: 90 + i }),
    ),
  };
}

const ids = (d: RoutineDoc) => d.exercises.map((e) => e.id);
const labels = (d: RoutineDoc) =>
  supersetPositions(d.exercises).map((p) => (p ? `${p.letter}${p.index}` : '-'));

describe('editor actions', () => {
  it('adds picked exercises with three working sets each', () => {
    const next = addExercises(
      doc(0),
      [
        { id: 'squat', mechanic: 'compound', logType: 'weight_reps' },
        { id: 'plank', mechanic: 'isolation', logType: 'duration' },
      ],
      testId,
      'rir',
    );
    expect(next.exercises.map((e) => [e.exerciseId, e.sets.length])).toEqual([
      ['squat', 3],
      ['plank', 3],
    ]);
  });

  it('makes a superset from selected exercises, gathering them in order', () => {
    const next = makeSuperset(doc(4), ['e4', 'e2']);
    expect(ids(next)).toEqual(['e1', 'e2', 'e4', 'e3']);
    expect(labels(next)).toEqual(['-', 'A1', 'A2', '-']);
    // No rest between members; the last member's rest becomes the round rest.
    expect(next.exercises[1]!.restSeconds).toBe(0);
    expect(next.exercises.slice(1, 3).map((e) => e.restAfterSupersetSeconds)).toEqual([93, 93]);
  });

  it('ignores a superset of one', () => {
    const d = doc(3);
    expect(makeSuperset(d, ['e1'])).toBe(d);
  });

  it('joins the next exercise and takes one out again', () => {
    const linked = supersetWithNext(doc(3), 'e1');
    expect(labels(linked)).toEqual(['A1', 'A2', '-']);
    const joined = supersetWithNext(linked, 'e2');
    expect(labels(joined)).toEqual(['A1', 'A2', 'A3']);
    const out = removeFromSuperset(joined, 'e1');
    expect(ids(out)).toEqual(['e2', 'e3', 'e1']);
    expect(labels(out)).toEqual(['A1', 'A2', '-']);
  });

  it('splits or dissolves supersets when a member moves away', () => {
    const d = makeSuperset(doc(3), ['e1', 'e2']);
    const moved = moveExercise(d, 0, 2);
    expect(ids(moved)).toEqual(['e2', 'e3', 'e1']);
    expect(labels(moved)).toEqual(['-', '-', '-']);
  });

  it('dissolves a superset when a member is removed', () => {
    const d = makeSuperset(doc(3), ['e1', 'e2']);
    expect(labels(removeExercise(d, 'e2'))).toEqual(['-', '-']);
  });

  it('duplicates after the whole superset with fresh ids', () => {
    const d = makeSuperset(doc(3), ['e1', 'e2']);
    const next = duplicateExercise(d, 'e1', testId);
    expect(next.exercises).toHaveLength(4);
    expect(labels(next)).toEqual(['A1', 'A2', '-', '-']);
    const copy = next.exercises[2]!;
    expect(copy.exerciseId).toBe('x1');
    expect(copy.sets.every((s, i) => s.id !== d.exercises[0]!.sets[i]!.id)).toBe(true);
  });

  it('replaces the exercise and keeps the sets', () => {
    const d = doc(1);
    d.exercises[0]!.sets = [set({ setType: 'top', reps: 5, weightKg: 100 })];
    const next = replaceExercise(
      d,
      'e1',
      { id: 'y', logType: 'weight_reps' },
      'weight_reps',
      'rir',
    );
    expect(next.exercises[0]).toMatchObject({ exerciseId: 'y' });
    expect(next.exercises[0]!.sets[0]).toMatchObject({ setType: 'top', reps: 5, weightKg: 100 });
  });
});

describe('editor store', () => {
  beforeEach(() => {
    const d = doc(2);
    useRoutineEditor.getState().reset();
    useRoutineEditor.getState().load(d, d);
  });

  it('tracks unsaved changes against the saved routine', () => {
    expect(selectDirty(useRoutineEditor.getState())).toBe(false);
    editRoutine((d) => moveExercise(d, 0, 1));
    expect(selectDirty(useRoutineEditor.getState())).toBe(true);
    useRoutineEditor.getState().undo();
    expect(selectDirty(useRoutineEditor.getState())).toBe(false);
  });

  it(`keeps the last ${UNDO_LIMIT} edits`, () => {
    for (let i = 0; i < 12; i++) editRoutine((d) => moveExercise(d, 0, 1));
    expect(useRoutineEditor.getState().past).toHaveLength(UNDO_LIMIT);
    for (let i = 0; i < 12; i++) useRoutineEditor.getState().undo();
    // Two edits are beyond the limit, so undo stops short of the saved routine.
    expect(useRoutineEditor.getState().past).toHaveLength(0);
    expect(selectDirty(useRoutineEditor.getState())).toBe(true);
  });

  it('skips edits that change nothing', () => {
    editRoutine((d) => d);
    expect(useRoutineEditor.getState().past).toHaveLength(0);
  });
});

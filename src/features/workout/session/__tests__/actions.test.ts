import { wexercise, workout, wset } from '@/lib/workouts/__fixtures__/workout';

import {
  addSet,
  dropOpenSets,
  moveExercise,
  openSetCount,
  removeExercise,
  replaceExercise,
  supersetWithNext,
  toggleFailed,
  toggleSet,
} from '../actions';

const none = { weightKg: null, reps: null, durationSec: null, distanceM: null };

describe('logging actions', () => {
  it('ticks with the suggestion and unticks again, touching only that set', () => {
    const e = wexercise();
    const other = wexercise();
    const doc = workout({ exercises: [e, other] });
    const done = toggleSet(doc, e.id, e.sets[0]!.id, { ...none, weightKg: 100, reps: 5 }, 't');
    expect(done.exercises[0]!.sets[0]).toMatchObject({ completed: true, weightKg: 100, reps: 5 });
    expect(done.exercises[0]!.sets[1]).toBe(e.sets[1]);
    expect(done.exercises[1]).toBe(other);
    const undone = toggleSet(done, e.id, e.sets[0]!.id, none, 't');
    expect(undone.exercises[0]!.sets[0]).toMatchObject({ completed: false, completedAt: null });
  });

  it('marks a missed set as done and failed', () => {
    const e = wexercise();
    const doc = toggleFailed(workout({ exercises: [e] }), e.id, e.sets[0]!.id, none, 't');
    expect(doc.exercises[0]!.sets[0]).toMatchObject({ completed: true, failed: true });
  });

  it('adds a set like the last and keeps supersets valid when exercises move', () => {
    const a = wexercise();
    const b = wexercise();
    const c = wexercise();
    let doc = supersetWithNext(workout({ exercises: [a, b, c] }), a.id);
    expect(doc.exercises.map((e) => e.supersetGroup)).toEqual([1, 1, null]);
    doc = moveExercise(doc, 1, 2);
    // b moved away from a: the superset dissolves.
    expect(doc.exercises.map((e) => e.supersetGroup)).toEqual([null, null, null]);
    doc = addSet(doc, a.id, 'weight_reps', () => 'new');
    expect(doc.exercises[0]!.sets).toHaveLength(4);
    expect(removeExercise(doc, a.id).exercises).toHaveLength(2);
  });

  it('replacing keeps sets but clears unlifted weights when the load works differently', () => {
    const e = wexercise({
      sets: [wset({ weightKg: 60, completed: true }), wset({ weightKg: 60, targetWeightKg: 60 })],
    });
    const doc = replaceExercise(workout({ exercises: [e] }), e.id, {
      id: 'pull-up',
      logType: 'weighted_bodyweight',
    });
    expect(doc.exercises[0]!.exerciseId).toBe('pull-up');
    expect(doc.exercises[0]!.sets[0]!.weightKg).toBe(60);
    expect(doc.exercises[0]!.sets[1]).toMatchObject({
      weightMode: 'bodyweight',
      weightKg: null,
      targetWeightKg: null,
    });
  });

  it('drops unticked sets (and empty exercises) when finishing', () => {
    const a = wexercise({ sets: [wset({ completed: true }), wset()] });
    const b = wexercise({ sets: [wset()] });
    const doc = workout({ exercises: [a, b] });
    expect(openSetCount(doc)).toBe(2);
    const kept = dropOpenSets(doc);
    expect(kept.exercises).toHaveLength(1);
    expect(kept.exercises[0]!.sets).toHaveLength(1);
  });
});

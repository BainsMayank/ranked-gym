import { exercise, set } from '@/lib/routines/__fixtures__/routine';
import type { RoutineDoc } from '@/lib/routines/types';

import { hasDeviated, routineFromWorkout } from '../deviation';
import { afterSet } from '../flow';
import { formatPrevious, matchPrevious } from '../lastTime';
import {
  completeSet,
  earlierSet,
  nextSet,
  planFromRoutine,
  startWorkout,
  suggestionFor,
} from '../session';
import { testId, wexercise, wset } from '../__fixtures__/workout';

const ctx = (oneRepMax?: (id: string) => number | null) => ({
  id: testId(),
  now: '2026-10-07T06:00:00.000Z',
  newId: testId,
  bodyweightKg: 72,
  visibility: 'friends' as const,
  oneRepMax,
});

function routine(exercises = [exercise()]): RoutineDoc {
  return {
    id: testId(),
    folderId: null,
    name: 'Leg day',
    description: null,
    colour: null,
    estimatedDurationMin: 60,
    source: 'manual',
    sourceRef: null,
    sortOrder: 0,
    archived: false,
    updatedAt: '2026-10-01T00:00:00.000Z',
    exercises,
  };
}

describe('starting from a routine', () => {
  it('copies targets and resolves percentages to kg', () => {
    const squat = exercise({
      sets: [
        set({
          setType: 'top',
          targetType: 'rep_range',
          repsMin: 4,
          repsMax: 6,
          weightMode: 'percent_of_1rm',
          weightPercent: 85,
        }),
        set({ setType: 'backoff', weightMode: 'percent_of_top_set', weightPercent: 80, reps: 8 }),
      ],
    });
    const doc = startWorkout(
      planFromRoutine(routine([squat])),
      ctx(() => 160),
    );
    const [top, backoff] = doc.exercises[0]!.sets;
    expect(top).toMatchObject({
      setType: 'top',
      targetRepsMin: 4,
      targetRepsMax: 6,
      targetWeightKg: 135,
      weightMode: 'absolute',
    });
    // 80% of 135 = 108 → 107.5 (2.5 kg steps).
    expect(backoff).toMatchObject({
      targetWeightKg: 107.5,
      targetReps: 8,
      completed: false,
      reps: null,
    });
    expect(doc).toMatchObject({ status: 'in_progress', name: 'Leg day', bodyweightKg: 72 });
  });

  it('leaves a % of 1RM load empty when the 1RM is unknown', () => {
    const r = routine([
      exercise({ sets: [set({ weightMode: 'percent_of_1rm', weightPercent: 70 })] }),
    ]);
    const doc = startWorkout(
      planFromRoutine(r),
      ctx(() => null),
    );
    expect(doc.exercises[0]!.sets[0]!.targetWeightKg).toBeNull();
  });

  it('never reuses routine ids (two sessions from one routine must not collide)', () => {
    const r = routine();
    const a = startWorkout(planFromRoutine(r), ctx());
    expect(a.exercises[0]!.id).not.toBe(r.exercises[0]!.id);
    expect(a.exercises[0]!.sets[0]!.id).not.toBe(r.exercises[0]!.sets[0]!.id);
  });
});

describe('suggestions and ticking', () => {
  it('suggests the target, else last time, clamped into a rep range', () => {
    const s = wset({ targetType: 'rep_range', targetRepsMin: 8, targetRepsMax: 10 });
    const prev = {
      setType: 'working' as const,
      weightMode: 'absolute' as const,
      reps: 12,
      weightKg: 60,
      durationSec: null,
      distanceM: null,
      rir: null,
      rpe: null,
    };
    expect(suggestionFor(s, prev)).toMatchObject({ reps: 10, weightKg: 60 });
    expect(suggestionFor(s, null)).toMatchObject({ reps: 8, weightKg: null });
    expect(suggestionFor(wset({ targetWeightKg: 80, targetReps: 5 }), prev)).toMatchObject({
      reps: 5,
      weightKg: 80,
    });
  });

  it('follows the set before it when there is no target or history (empty workouts)', () => {
    const sets = [
      wset({ setType: 'warmup', weightKg: 40, reps: 10, completed: true }),
      wset({ weightKg: 100, reps: 6, completed: true }),
      wset(),
    ];
    expect(earlierSet(sets, 2)).toBe(sets[1]);
    expect(earlierSet(sets, 1)).toBeNull();
    expect(suggestionFor(sets[2]!, null, earlierSet(sets, 2))).toMatchObject({
      weightKg: 100,
      reps: 6,
    });
  });

  it('fills empty values from the suggestion when ticked, keeping typed ones', () => {
    const done = completeSet(
      wset({ reps: 6 }),
      { weightKg: 100, reps: 5, durationSec: null, distanceM: null },
      'now',
    );
    expect(done).toMatchObject({ reps: 6, weightKg: 100, completed: true, completedAt: 'now' });
  });

  it('adds a set like the last one, but not done', () => {
    const last = wset({
      setType: 'top',
      weightKg: 140,
      reps: 3,
      completed: true,
      targetRepsMin: 4,
      targetRepsMax: 6,
    });
    expect(nextSet([last], 'x', 'weight_reps')).toMatchObject({
      setType: 'backoff',
      targetWeightKg: 140,
      completed: false,
      reps: null,
    });
  });
});

describe('after a set', () => {
  it('rests the exercise rest, then moves to its next open set', () => {
    const e = wexercise({ restSeconds: 150 });
    e.sets[0]!.completed = true;
    expect(afterSet([e], { exerciseId: e.id, setId: e.sets[0]!.id })).toEqual({
      restSec: 150,
      next: { exerciseId: e.id, setId: e.sets[1]!.id },
    });
  });

  it('caps warm-up rest at 60 s and goes straight into a drop set', () => {
    const e = wexercise({
      restSeconds: 180,
      sets: [
        wset({ setType: 'warmup', completed: true }),
        wset({ completed: true }),
        wset({ setType: 'drop' }),
      ],
    });
    expect(afterSet([e], { exerciseId: e.id, setId: e.sets[0]!.id }).restSec).toBe(60);
    expect(afterSet([e], { exerciseId: e.id, setId: e.sets[1]!.id }).restSec).toBe(0);
  });

  it('moves through a superset round before resting', () => {
    const a1 = wexercise({ supersetGroup: 1, restSeconds: 0, restAfterSupersetSeconds: 90 });
    const a2 = wexercise({ supersetGroup: 1, restSeconds: 0, restAfterSupersetSeconds: 90 });
    a1.sets[0]!.completed = true;
    // A1 set 1 → A2 set 1, no rest.
    expect(afterSet([a1, a2], { exerciseId: a1.id, setId: a1.sets[0]!.id })).toEqual({
      restSec: 0,
      next: { exerciseId: a2.id, setId: a2.sets[0]!.id },
    });
    a2.sets[0]!.completed = true;
    // A2 set 1 ends the round → round rest, back to A1 set 2.
    expect(afterSet([a1, a2], { exerciseId: a2.id, setId: a2.sets[0]!.id })).toEqual({
      restSec: 90,
      next: { exerciseId: a1.id, setId: a1.sets[1]!.id },
    });
  });

  it('starts no rest after the last set of the workout', () => {
    const e = wexercise({ sets: [wset({ completed: true })] });
    expect(afterSet([e], { exerciseId: e.id, setId: e.sets[0]!.id })).toEqual({
      restSec: 0,
      next: null,
    });
  });
});

describe('last time', () => {
  it('matches warm-ups to warm-ups and working sets to working sets', () => {
    const prev = [
      {
        setType: 'warmup' as const,
        weightMode: 'absolute' as const,
        reps: 8,
        weightKg: 60,
        durationSec: null,
        distanceM: null,
        rir: null,
        rpe: null,
      },
      {
        setType: 'working' as const,
        weightMode: 'absolute' as const,
        reps: 5,
        weightKg: 100,
        durationSec: null,
        distanceM: null,
        rir: null,
        rpe: null,
      },
    ];
    const current = [
      { setType: 'warmup' as const },
      { setType: 'warmup' as const },
      { setType: 'working' as const },
    ];
    const matched = matchPrevious(current, prev);
    expect(matched[0]?.weightKg).toBe(60);
    expect(matched[1]).toBeNull();
    expect(matched[2]?.weightKg).toBe(100);
    expect(formatPrevious(prev[1]!, 'kg')).toBe('100 × 5');
    expect(formatPrevious({ ...prev[1]!, weightMode: 'bodyweight', weightKg: 10 }, 'kg')).toBe(
      '+10 × 5',
    );
  });
});

describe('update routine with these changes', () => {
  it('is unchanged when the session followed the routine', () => {
    const r = routine([
      exercise({ sets: [set({ weightKg: 100, reps: 5 }), set({ weightKg: 100, reps: 5 })] }),
    ]);
    const w = startWorkout(planFromRoutine(r), ctx());
    for (const s of w.exercises[0]!.sets)
      Object.assign(s, { completed: true, weightKg: 100, reps: 5 });
    expect(hasDeviated(r, w)).toBe(false);
  });

  it('takes added sets, new exercises and heavier weights, keeping ids that line up', () => {
    const r = routine([exercise({ sets: [set({ weightKg: 100, reps: 5 })] })]);
    const w = startWorkout(planFromRoutine(r), ctx());
    const squat = w.exercises[0]!;
    squat.sets[0] = { ...squat.sets[0]!, completed: true, weightKg: 102.5, reps: 5 };
    squat.sets.push(wset({ completed: true, weightKg: 102.5, reps: 4 }));
    w.exercises.push(wexercise({ sets: [wset({ completed: true, weightKg: 40, reps: 12 })] }));

    expect(hasDeviated(r, w)).toBe(true);
    const updated = routineFromWorkout(r, w, testId, 'now');
    expect(updated.exercises).toHaveLength(2);
    expect(updated.exercises[0]!.id).toBe(r.exercises[0]!.id);
    expect(updated.exercises[0]!.sets[0]).toMatchObject({
      id: r.exercises[0]!.sets[0]!.id,
      weightKg: 102.5,
      reps: 5,
    });
    expect(updated.exercises[0]!.sets[1]).toMatchObject({
      targetType: 'reps',
      reps: 4,
      weightKg: 102.5,
    });
    expect(updated.exercises[1]!.sets[0]).toMatchObject({
      targetType: 'reps',
      reps: 12,
      weightKg: 40,
    });
  });

  it('keeps a percentage load when the lifter used what it resolved to', () => {
    const r = routine([
      exercise({ sets: [set({ weightMode: 'percent_of_1rm', weightPercent: 80, reps: 5 })] }),
    ]);
    const w = startWorkout(
      planFromRoutine(r),
      ctx(() => 125),
    );
    const s = w.exercises[0]!.sets[0]!;
    Object.assign(s, { completed: true, weightKg: s.targetWeightKg, reps: 5 });
    expect(hasDeviated(r, w)).toBe(false);
  });
});

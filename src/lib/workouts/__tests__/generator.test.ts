import { exercises as seed } from '../../../../supabase/seed/exercises.ts';
import { estimateDurationSec } from '@/lib/routines/duration';
import { equipmentTypes, type Equipment, type Muscle } from '@/lib/exercises/taxonomy';

import {
  candidatesFor,
  generateWorkout,
  pickSplit,
  rerollExercise,
  sessionLengths,
  type GenExercise,
  type GeneratorOptions,
} from '../generator/generate';
import { isCompoundPattern, movementPattern } from '../generator/patterns';
import { createRng } from '../generator/random';
import { testId } from '../__fixtures__/workout';

// The official library as the app holds it.
const library: GenExercise[] = seed.map((e) => ({
  id: `id-${e.slug}`,
  slug: e.slug,
  name: e.name,
  category: e.category,
  equipment: e.equipment,
  mechanic: e.mechanic,
  logType: e.logType,
  muscles: e.muscles,
  createdBy: null,
  isRankable: !!e.rankKey,
}));
const byId = new Map(library.map((e) => [e.id, e]));
const DAY = 86_400_000;
const NOW = Date.parse('2026-10-07T06:00:00Z');

const ctx = (lastTrained?: Map<Muscle, number>) => ({
  library,
  lastTrained,
  now: NOW,
  effort: 'rir' as const,
  newId: testId,
});

const options = (patch: Partial<GeneratorOptions> = {}): GeneratorOptions => ({
  focus: { kind: 'surprise' },
  minutes: 45,
  equipment: [...equipmentTypes],
  intensity: 'moderate',
  seed: 1,
  ...patch,
});

const patternsOf = (ids: string[]) => ids.map((id) => movementPattern(byId.get(id)!));

describe('movement patterns', () => {
  it.each([
    ['barbell-back-squat', 'squat'],
    ['barbell-deadlift', 'hinge'],
    ['barbell-romanian-deadlift', 'hinge'],
    ['barbell-bench-press', 'h_push'],
    ['barbell-overhead-press', 'v_push'],
    ['barbell-bent-over-row', 'h_pull'],
    ['lat-pulldown', 'v_pull'],
    ['pull-up', 'v_pull'],
    ['dumbbell-bulgarian-split-squat', 'lunge'],
    ['parallel-bar-dip', 'h_push'],
  ])('%s is %s', (slug, pattern) => {
    expect(movementPattern(byId.get(`id-${slug}`)!)).toBe(pattern);
  });

  it('gives isolation work a pattern per muscle', () => {
    expect(movementPattern(byId.get('id-leg-extension')!)).toBe('iso:quads');
  });
});

describe('generateWorkout', () => {
  const grid = sessionLengths.flatMap((minutes) =>
    (['light', 'moderate', 'hard'] as const).flatMap((intensity) =>
      [1, 2, 3].map((seed) => ({ minutes, intensity, seed })),
    ),
  );

  it.each(grid)('fits $minutes min ($intensity, seed $seed)', ({ minutes, intensity, seed }) => {
    const w = generateWorkout(options({ minutes, intensity, seed }), ctx());
    expect(w.exercises.length).toBeGreaterThan(0);
    // One exercise is always allowed; beyond that the estimate stays inside the time.
    if (w.exercises.length > 1)
      expect(estimateDurationSec(w.exercises)).toBeLessThanOrEqual(minutes * 60);
    // Longer sessions get more work.
    if (minutes >= 45) expect(w.exercises.length).toBeGreaterThanOrEqual(3);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    'puts compound lifts first and never repeats a pattern in 45 min (seed %i)',
    (seed) => {
      const w = generateWorkout(options({ seed }), ctx());
      const patterns = patternsOf(w.exercises.map((e) => e.exerciseId));
      const firstIso = patterns.findIndex((p) => !isCompoundPattern(p));
      if (firstIso >= 0)
        expect(patterns.slice(firstIso).every((p) => !isCompoundPattern(p))).toBe(true);
      expect(isCompoundPattern(patterns[0]!)).toBe(true);
      expect(new Set(patterns).size).toBe(patterns.length);
      expect(new Set(w.exercises.map((e) => e.exerciseId)).size).toBe(w.exercises.length);
    },
  );

  it('uses only the equipment available (bodyweight always allowed)', () => {
    const equipment: Equipment[] = ['dumbbell'];
    for (const seed of [1, 2, 3, 4]) {
      const w = generateWorkout(options({ equipment, seed, minutes: 60 }), ctx());
      for (const e of w.exercises)
        expect(['dumbbell', 'bodyweight']).toContain(byId.get(e.exerciseId)!.equipment);
    }
  });

  it('trains the chosen regions', () => {
    const w = generateWorkout(
      options({ focus: { kind: 'regions', regions: ['chest', 'back'] }, minutes: 60 }),
      ctx(),
    );
    expect(w.name).toBe('Chest and back');
    const primaries = new Set(
      w.exercises.flatMap((e) =>
        byId
          .get(e.exerciseId)!
          .muscles.filter((m) => m.role === 'primary')
          .map((m) => m.muscle),
      ),
    );
    expect([...primaries].some((m) => m === 'mid_lower_chest' || m === 'upper_chest')).toBe(true);
    expect([...primaries].some((m) => m === 'lats' || m === 'upper_back')).toBe(true);
    for (const e of w.exercises.slice(0, 3)) {
      const regions = byId
        .get(e.exerciseId)!
        .muscles.filter((m) => m.role === 'primary')
        .map((m) => m.muscle);
      expect(
        regions.some((m) =>
          ['upper_chest', 'mid_lower_chest', 'lats', 'upper_back', 'traps', 'lower_back'].includes(
            m,
          ),
        ),
      ).toBe(true);
    }
  });

  it('is the same for the same seed and different for another', () => {
    const a = generateWorkout(options({ seed: 42 }), ctx());
    const b = generateWorkout(options({ seed: 42 }), ctx());
    const c = generateWorkout(options({ seed: 43 }), ctx());
    expect(a.exercises.map((e) => e.exerciseId)).toEqual(b.exercises.map((e) => e.exerciseId));
    expect(c.exercises.map((e) => e.exerciseId)).not.toEqual(a.exercises.map((e) => e.exerciseId));
  });

  it('gives working sets with targets the routine model accepts', () => {
    const w = generateWorkout(options({ intensity: 'hard' }), ctx());
    for (const e of w.exercises) {
      for (const s of e.sets) {
        expect(s).toMatchObject({ setType: 'working', targetType: 'rep_range', rir: 1 });
        expect(s.repsMin!).toBeLessThan(s.repsMax!);
      }
    }
  });

  it('returns an empty workout when nothing fits the equipment', () => {
    const w = generateWorkout(options(), { ...ctx(), library: [] });
    expect(w.exercises).toEqual([]);
  });
});

describe('surprise me', () => {
  it('picks full body with no history', () => {
    expect(pickSplit(undefined, NOW, createRng(1))).toBe('full');
  });

  it('picks the split you trained least recently', () => {
    const last = new Map<Muscle, number>();
    for (const m of [
      'upper_chest',
      'mid_lower_chest',
      'front_delts',
      'side_delts',
      'triceps',
    ] as Muscle[])
      last.set(m, NOW - 1 * DAY);
    for (const m of ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] as Muscle[])
      last.set(m, NOW - 2 * DAY);
    for (const m of ['lats', 'upper_back', 'rear_delts', 'biceps'] as Muscle[])
      last.set(m, NOW - 3 * DAY);
    expect(pickSplit(last, NOW, createRng(1))).toBe('pull');
    const w = generateWorkout(options(), ctx(last));
    expect(w.name).toBe('Pull day');
  });
});

describe('reroll', () => {
  it('swaps one exercise for another of the same pattern and keeps the rest', () => {
    const w = generateWorkout(options({ minutes: 60 }), ctx());
    const next = rerollExercise(w, 0, options({ minutes: 60 }), ctx(), 7);
    expect(next.exercises[0]!.exerciseId).not.toBe(w.exercises[0]!.exerciseId);
    expect(movementPattern(byId.get(next.exercises[0]!.exerciseId)!)).toBe(
      movementPattern(byId.get(w.exercises[0]!.exerciseId)!),
    );
    expect(next.exercises.slice(1)).toEqual(w.exercises.slice(1));
    expect(next.exercises[0]!.sets).toHaveLength(w.exercises[0]!.sets.length);
  });

  it('never picks an exercise already in the workout', () => {
    const w = generateWorkout(options({ minutes: 90 }), ctx());
    for (let i = 0; i < w.exercises.length; i++) {
      const next = rerollExercise(w, i, options({ minutes: 90 }), ctx(), i + 11);
      const ids = next.exercises.map((e) => e.exerciseId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('only offers candidates that suit a random session', () => {
    const ids = new Set(candidatesFor(library, [...equipmentTypes]).map((e) => e.slug));
    expect(ids.has('power-clean')).toBe(false);
    expect(ids.has('plank')).toBe(false); // timed
    expect(ids.has('barbell-back-squat')).toBe(true);
  });
});

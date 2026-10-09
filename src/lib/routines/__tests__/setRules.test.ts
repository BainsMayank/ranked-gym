import { Constants } from '@/types/database';

import { exercise, set } from '../__fixtures__/routine';
import {
  countWorkingSets,
  dropParentIndex,
  fixLeadingDrop,
  isWorkingSet,
  normaliseSupersets,
  setClusters,
  setMarks,
  supersetPositions,
  topSetBefore,
} from '../setRules';
import { effortMetrics, routineSources, setTypes, targetTypes, weightModes } from '../taxonomy';

const enums = Constants.public.Enums;

describe('routine taxonomy', () => {
  it('matches the Postgres enums exactly', () => {
    expect([...setTypes]).toEqual([...enums.set_type]);
    expect([...targetTypes]).toEqual([...enums.target_type]);
    expect([...weightModes]).toEqual([...enums.weight_mode]);
    expect([...routineSources]).toEqual([...enums.routine_source]);
    expect([...effortMetrics]).toEqual([...enums.effort_metric]);
  });
});

describe('set-type rules', () => {
  const sets = [
    set({ setType: 'warmup' }),
    set({ setType: 'warmup' }),
    set({ setType: 'top' }),
    set({ setType: 'backoff' }),
    set({ setType: 'working' }),
    set({ setType: 'drop' }),
    set({ setType: 'drop' }),
    set({ setType: 'working' }),
    set({ setType: 'failure' }),
    set({ setType: 'amrap' }),
  ];

  it('excludes warm-ups from working sets and counts every other type', () => {
    expect(isWorkingSet({ setType: 'warmup' })).toBe(false);
    for (const t of setTypes.filter((x) => x !== 'warmup')) {
      expect(isWorkingSet({ setType: t })).toBe(true);
    }
    expect(countWorkingSets(sets)).toBe(8);
  });

  it('numbers working sets and letters the rest', () => {
    expect(setMarks(sets)).toEqual(['W', 'W', 'T', 'B', '1', 'D', 'D', '2', 'F', 'A']);
  });

  it('hangs drop sets off the nearest earlier non-drop set', () => {
    expect(dropParentIndex(sets, 5)).toBe(4);
    expect(dropParentIndex(sets, 6)).toBe(4);
    expect(dropParentIndex(sets, 4)).toBeNull();
    expect(setClusters(sets).map((c) => c.length)).toEqual([1, 1, 1, 1, 3, 1, 1, 1]);
  });

  it('turns a leading drop set into a working set', () => {
    const fixed = fixLeadingDrop([set({ setType: 'drop' }), set({ setType: 'drop' })]);
    expect(fixed.map((s) => s.setType)).toEqual(['working', 'drop']);
  });

  it('finds the top set a back-off refers to', () => {
    expect(topSetBefore(sets, 3)).toBe(sets[2]);
    expect(topSetBefore(sets, 1)).toBeNull();
  });
});

describe('supersets', () => {
  it('labels members A1, A2 and later groups B1, B2', () => {
    const list = [
      exercise(),
      exercise({ supersetGroup: 4 }),
      exercise({ supersetGroup: 4 }),
      exercise({ supersetGroup: 9 }),
      exercise({ supersetGroup: 9 }),
      exercise({ supersetGroup: 9 }),
    ];
    const labels = supersetPositions(list).map((p) => (p ? `${p.letter}${p.index}` : null));
    expect(labels).toEqual([null, 'A1', 'A2', 'B1', 'B2', 'B3']);
  });

  it('renumbers groups and copies the round rest to every member', () => {
    const a = exercise({ supersetGroup: 7, restAfterSupersetSeconds: null, restSeconds: 0 });
    const b = exercise({ supersetGroup: 7, restAfterSupersetSeconds: 120, restSeconds: 0 });
    const out = normaliseSupersets([a, b]);
    expect(out.map((e) => e.supersetGroup)).toEqual([1, 1]);
    expect(out.map((e) => e.restAfterSupersetSeconds)).toEqual([120, 120]);
  });

  it('dissolves a group of one (after a delete)', () => {
    const lone = exercise({ supersetGroup: 1, restAfterSupersetSeconds: 90 });
    const [out] = normaliseSupersets([exercise(), lone]).slice(1);
    expect(out!.supersetGroup).toBeNull();
    expect(out!.restAfterSupersetSeconds).toBeNull();
  });

  it('splits members that are no longer next to each other (after a reorder)', () => {
    const a = exercise({ supersetGroup: 1 });
    const b = exercise({ supersetGroup: 1 });
    const c = exercise({ supersetGroup: 1 });
    const solo = exercise();
    // a, solo, b, c: a is alone now; b and c remain a superset.
    const out = normaliseSupersets([a, solo, b, c]);
    expect(out.map((e) => e.supersetGroup)).toEqual([null, null, 1, 1]);
  });

  it('keeps the same array when nothing changes', () => {
    const list = [exercise(), exercise()];
    expect(normaliseSupersets(list)).toBe(list);
  });
});

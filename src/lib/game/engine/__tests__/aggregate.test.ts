import { exercises } from '../../../../../supabase/seed/exercises.ts';
import { liftMusclesFromLibrary, rankConfig } from '../../../../../supabase/seed/standards.ts';
import { DAY, makeSet } from '../__fixtures__/sets';
import { aggregate, placement } from '../aggregate';
import { computeRanks, liftScoresInWindow, type RankInput } from '../compute';
import type { RankKey } from '../../rankKeys';
import type { LiftMuscles } from '../types';

const config = rankConfig;
const liftMuscles = liftMusclesFromLibrary(exercises);

describe('muscle, region and overall maths', () => {
  const muscles: LiftMuscles = {
    benchPress: [
      { muscle: 'mid_lower_chest', role: 'primary', weight: 1 },
      { muscle: 'triceps', role: 'secondary', weight: 0.5 },
      { muscle: 'abs', role: 'stabiliser', weight: 0.25 },
    ],
    closeGripBench: [
      { muscle: 'triceps', role: 'primary', weight: 1 },
      { muscle: 'mid_lower_chest', role: 'secondary', weight: 0.5 },
    ],
    backSquat: [{ muscle: 'quads', role: 'primary', weight: 1 }],
  };

  it('weights each lift by how much it trains the muscle; stabilisers never count', () => {
    const agg = aggregate(
      new Map<RankKey, number>([
        ['benchPress', 400],
        ['closeGripBench', 100],
      ]),
      muscles,
      config,
    );
    // Chest: (1 × 400 + 0.5 × 100) / 1.5; triceps: (0.5 × 400 + 1 × 100) / 1.5.
    expect(agg.muscles.get('mid_lower_chest')).toBe(300);
    expect(agg.muscles.get('triceps')).toBe(200);
    expect(agg.muscles.has('abs')).toBe(false);
    expect(agg.regions.get('chest')).toBe(300);
    expect(agg.regions.get('arms')).toBe(200);
  });

  it('weights regions and renormalises over the ranked ones', () => {
    const agg = aggregate(
      new Map<RankKey, number>([
        ['benchPress', 400],
        ['backSquat', 600],
      ]),
      { benchPress: muscles.benchPress, backSquat: muscles.backSquat },
      config,
    );
    // chest 400 (w .2), arms 400 (w .1), legs 600 (w .25)
    expect(agg.weighted).toBeCloseTo((0.2 * 400 + 0.1 * 400 + 0.25 * 600) / 0.55, 1);
  });

  it('leaves untrained muscles unranked', () => {
    const agg = aggregate(new Map([['backSquat', 500]]), muscles, config);
    expect([...agg.muscles.keys()]).toEqual(['quads']);
    expect(aggregate(new Map(), muscles, config).weighted).toBeNull();
  });
});

describe('placement', () => {
  const scores = (keys: RankKey[]) =>
    aggregate(new Map(keys.map((k) => [k, 300])), liftMuscles, config);

  it.each<[RankKey[], boolean]>([
    [['benchPress', 'backSquat', 'deadlift'], false],
    [['benchPress', 'inclineBench', 'closeGripBench', 'dumbbellBench', 'dip'], false],
    [['benchPress', 'backSquat', 'pullUp', 'overheadPress', 'barbellCurl'], true],
  ])('%p placed: %p', (keys, placed) => {
    expect(placement(scores(keys), config).placed).toBe(placed);
  });

  it('reports progress like placement matches', () => {
    const p = placement(scores(['benchPress', 'backSquat', 'pullUp']), config);
    expect(p).toMatchObject({ lifts: 3, needLifts: 5, needRegions: 4 });
  });
});

describe('the 180-day window ends at each lift’s latest set', () => {
  it('keeps a frozen score while away and rescored on return', () => {
    const scored = [
      { key: 'benchPress' as const, setId: 'old-pr', at: 0, score: 500 },
      { key: 'benchPress' as const, setId: 'recent', at: 100 * DAY, score: 450 },
    ];
    // Still inside 180 days of the latest set: the old PR counts.
    expect(liftScoresInWindow(scored, 180).get('benchPress')?.score).toBe(500);
    // A set 200 days after the PR pushes it out.
    const back = [
      ...scored,
      { key: 'benchPress' as const, setId: 'return', at: 200 * DAY, score: 420 },
    ];
    expect(liftScoresInWindow(back, 180).get('benchPress')).toMatchObject({
      score: 450,
      bestSetId: 'recent',
      lastSetAt: 200 * DAY,
    });
  });
});

describe('computeRanks', () => {
  const base: Omit<RankInput, 'sets'> = {
    config,
    bodyweights: [{ weightKg: 75, at: 0 }],
    sex: 'male',
    birthYear: 2004,
    now: new Date(Date.UTC(2026, 9, 8)),
    liftMuscles,
  };
  const set = (rankKey: RankKey, weightKg: number, reps: number, extra = {}) =>
    makeSet({ rankKey, weightKg, reps, exerciseId: rankKey, ...extra });

  // 70 × 5 is an 80.2 kg e1RM: Gold for a 75 kg man (72.5–90 kg).
  it('ranks lifts, muscles and regions, but holds overall until placement', () => {
    const r = computeRanks({ ...base, sets: [set('benchPress', 70, 5), set('backSquat', 100, 5)] });
    expect(r.entries.find((e) => e.scope === 'lift' && e.key === 'benchPress')?.tier).toBe('gold');
    expect(r.entries.find((e) => e.scope === 'overall')).toMatchObject({
      status: 'placement',
      score: null,
    });
    expect(r.placement).toMatchObject({ lifts: 2, placed: false });
    expect(r.entries.find((e) => e.scope === 'weightlifting')?.status).toBe('placement');
  });

  it('places the overall rank with 5 lifts over 4 regions', () => {
    const r = computeRanks({
      ...base,
      sets: [
        set('benchPress', 85, 1),
        set('backSquat', 117.5, 1),
        set('barbellRow', 77, 1),
        set('overheadPress', 55, 1),
        set('barbellCurl', 42, 1),
      ],
    });
    const overall = r.entries.find((e) => e.scope === 'overall');
    expect(overall?.status).toBe('ranked');
    expect(overall?.tier).toBe('gold');
    expect(r.entries.find((e) => e.scope === 'weightlifting')?.tier).toBe('gold');
    expect(r.entries.some((e) => e.scope === 'calisthenics')).toBe(false);
  });

  it('flags impossible sets instead of scoring them', () => {
    const r = computeRanks({
      ...base,
      sets: [set('benchPress', 320, 1), set('backSquat', 100, 5)],
    });
    expect(r.flags).toEqual([{ setId: expect.any(String), reason: 'e1rm_over_limit' }]);
    expect(r.lifts.has('benchPress')).toBe(false);
  });

  it('notes weighted sets waiting on a weigh-in', () => {
    const r = computeRanks({ ...base, bodyweights: [], sets: [set('benchPress', 80, 5)] });
    expect(r.needsBodyweight.size).toBe(1);
    expect(r.lifts.size).toBe(0);
  });
});

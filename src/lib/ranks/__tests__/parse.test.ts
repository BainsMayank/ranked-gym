import { serverRewards } from '../__fixtures__/rewards';
import { changeName, headlineChange, prLabel, prValue, sortChanges } from '../format';
import { parsePrediction, parseRewards } from '../parse';

describe('parseRewards', () => {
  it('reads what save_workout returns', () => {
    const r = parseRewards(serverRewards());
    expect(r).toMatchObject({
      workoutId: 'aaaaaaaa-0000-0000-0000-000000000002',
      baselines: 1,
      needsBodyweight: false,
      flagged: 0,
      placement: { lifts: 2, regions: 2, needLifts: 5, needRegions: 4, placed: false },
    });
    expect(r?.prs).toHaveLength(2);
    expect(r?.rankChanges[1]).toEqual({
      scope: 'lift',
      key: 'benchPress',
      name: 'Bench press',
      kind: 'rank_up',
      from: { tier: 'silver', division: 1 },
      to: { tier: 'gold', division: 2 },
      score: 466.29,
    });
  });

  it('drops malformed entries instead of failing', () => {
    const r = parseRewards(
      serverRewards({
        prs: [{ kind: 'nonsense' }, 3, null],
        rank_changes: [{ scope: 'lift', key: 'x', kind: 'rank_up', to_tier: 'mythril', score: 1 }],
        placement: null,
      }),
    );
    expect(r).toMatchObject({ prs: [], rankChanges: [], placement: null });
    expect(parseRewards(null)).toBeNull();
    expect(parseRewards({ prs: [] })).toBeNull();
  });

  it('reads Champion without a division', () => {
    const r = parseRewards(
      serverRewards({
        rank_changes: [
          {
            scope: 'overall',
            key: 'overall',
            kind: 'placed',
            to_tier: 'champion',
            to_division: null,
            score: 960,
          },
        ],
      }),
    );
    expect(r?.rankChanges[0]?.to).toEqual({ tier: 'champion' });
  });
});

describe('formatting', () => {
  const r = parseRewards(serverRewards());
  const changes = r?.rankChanges ?? [];

  it('puts lifts before muscles and rank-downs last', () => {
    expect(sortChanges(changes).map((c) => c.key)).toEqual(['benchPress', 'triceps', 'pullUp']);
    expect(headlineChange(changes)?.key).toBe('benchPress');
  });

  it('names muscles and scopes for people', () => {
    expect(changes.map(changeName)).toEqual(['Triceps', 'Bench press', 'Pull-up']);
  });

  it('labels records in the user’s unit', () => {
    const [e1rm, reps] = r?.prs ?? [];
    expect(e1rm && prLabel(e1rm, 'kg')).toBe('Estimated 1RM');
    expect(e1rm && prValue(e1rm, 'kg')).toEqual({ now: '80.2 kg', before: '68.8 kg' });
    expect(reps && prLabel(reps, 'lb')).toBe('Most reps at 132.3 lb');
    expect(reps && prValue(reps, 'lb')).toEqual({ now: '8 reps', before: '5' });
  });

  it('has no headline when every change is a rank-down', () => {
    expect(headlineChange(changes.filter((c) => c.kind === 'rank_down'))).toBeNull();
  });
});

describe('parsePrediction', () => {
  it('reads loads, reps and the ETA', () => {
    const p = parsePrediction({
      rank_key: 'benchPress',
      score: '357.56',
      next_tier: 'gold',
      next_division: 3,
      target_score: 400,
      e1rm_kg: 85.2,
      loads: [
        { reps: 1, kg: 85.5 },
        { reps: 5, kg: '74.5' },
      ],
      eta: { status: 'ok', days: 21 },
      bodyweight_stale: true,
    });
    expect(p).toMatchObject({
      score: 357.56,
      next: { tier: 'gold', division: 3 },
      loads: [
        { reps: 1, kg: 85.5 },
        { reps: 5, kg: 74.5 },
      ],
      eta: { status: 'ok', days: 21 },
      bodyweightStale: true,
    });
    expect(parsePrediction({ rank_key: 'x', score: 1, eta: {} })?.eta).toEqual({
      status: 'need_more_sessions',
    });
  });
});

import { evenThresholds } from '@/lib/game/engine/tiers';
import type { ExerciseMuscle } from '@/lib/exercises/types';

import { TIER_FLOORS } from '../../../../supabase/seed/standards.ts';
import {
  closestPredictions,
  musclesByTier,
  peakIndex,
  rankUpsByDayPart,
  rankUpsByWeekday,
  regionShares,
} from '../analysis';
import { balanceRatios, balanceSuggestion, regionStandings, tierGapWords } from '../balance';
import { parseRankEvent, parseRankHistory, rangeStart, type RankEvent } from '../history';
import { ladderPosition, pointsToNext, type RankLadder } from '../ladder';
import { parseLiftDetail, parseLiftPercentile } from '../liftDetail';
import { muscleBreakdown } from '../muscleBreakdown';
import { parseCurrentRank, parsePrediction } from '../parse';
import { parseRecordEntry, type RecordEntry } from '../records';
import { groupRecords } from '../recordFormat';
import { latestPromotion, rankSeries } from '../series';
import type { CurrentRank, RankPrediction } from '../types';

const ladder: RankLadder = {
  version: 1,
  thresholds: evenThresholds(TIER_FLOORS),
  maxScore: 1000,
  windowDays: 180,
  inactiveDays: 60,
};

const rankRow = (scope: CurrentRank['scope'], key: string, score: number): CurrentRank => {
  const p = ladderPosition(score, ladder);
  return {
    scope,
    key,
    score,
    rank: p.division ? { tier: p.tier, division: p.division } : { tier: p.tier },
    status: 'ranked',
    lastSetAt: null,
    inactive: false,
    details: null,
  };
};

const event = (at: Date, over: Partial<RankEvent> = {}): RankEvent => ({
  scope: 'lift',
  key: 'benchPress',
  kind: 'rank_up',
  from: { tier: 'silver', division: 1 },
  to: { tier: 'gold', division: 3 },
  score: 400,
  at: at.toISOString(),
  workoutId: null,
  ...over,
});

describe('parsers', () => {
  it('keeps placement progress on current ranks', () => {
    const r = parseCurrentRank({
      scope: 'overall',
      key: 'overall',
      score: null,
      tier: null,
      division: null,
      status: 'placement',
      details: { lifts: 3, regions: 2, need_lifts: 5, need_regions: 4 },
    });
    expect(r?.details).toEqual({ lifts: 3, needLifts: 5, regions: 2, needRegions: 4 });
    expect(r?.rank).toBeNull();
  });

  it('reads rank history and drops broken rows', () => {
    const h = parseRankHistory({
      snapshots: [
        { at: '2026-09-01T10:00:00Z', score: '410.5', tier: 'gold', division: 3 },
        { at: '2026-09-02T10:00:00Z', score: 'x', tier: 'gold', division: 3 },
      ],
      events: [
        {
          at: '2026-09-01T09:00:00Z',
          kind: 'rank_up',
          to_tier: 'gold',
          to_division: 3,
          from_tier: 'silver',
          from_division: 1,
          score: 410.5,
        },
      ],
    });
    expect(h.snapshots).toEqual([
      { at: '2026-09-01T10:00:00Z', score: 410.5, rank: { tier: 'gold', division: 3 } },
    ]);
    expect(h.events[0]?.from).toEqual({ tier: 'silver', division: 1 });
    expect(parseRankHistory(null)).toEqual({ snapshots: [], events: [] });
  });

  it('reads events, records, lift detail and the percentile', () => {
    expect(
      parseRankEvent({
        scope: 'lift',
        key: 'deadlift',
        kind: 'placed',
        to_tier: 'iron',
        to_division: 2,
        score: 40,
        at: '2026-01-01T00:00:00Z',
      }),
    ).toMatchObject({ scope: 'lift', kind: 'placed', from: null, workoutId: null });

    expect(
      parseRecordEntry({
        exercise_id: 'e1',
        exercise_name: 'Bench press',
        rank_key: 'benchPress',
        log_type: 'weight_reps',
        kind: 'e1rm',
        weight_kg: null,
        value: '83.1',
        previous_value: null,
        achieved_at: '2026-10-01T10:00:00Z',
        workout_id: 'w1',
        workout_name: 'Push day',
        set_reps: 5,
        set_weight_kg: '72.5',
        set_duration_sec: null,
      }),
    ).toMatchObject({
      value: 83.1,
      previousValue: null,
      set: { reps: 5, weightKg: 72.5, durationSec: null },
    });

    const d = parseLiftDetail({
      rank_key: 'benchPress',
      name: 'Bench press',
      discipline: 'weightlifting',
      bodyweight_kg: 75,
      rank: {
        score: 466.3,
        tier: 'gold',
        division: 2,
        best_set_id: 's1',
        last_set_at: '2026-10-01T10:00:00Z',
      },
      standards: [
        {
          metric: 'e1rm_ratio',
          anchors: [{ score: 100, tier: 'bronze', value: 42.5 }, { score: 'bad' }],
        },
      ],
      sets: [
        {
          set_id: 's1',
          workout_id: 'w1',
          at: '2026-10-01T10:00:00Z',
          weight_kg: 72.5,
          reps: 5,
          e1rm: 83.1,
          score: 466.3,
          is_best: true,
        },
      ],
      sessions: [{ at: '2026-10-01T09:00:00Z', workout_id: 'w1', e1rm: 83.1 }],
    });
    expect(d?.rank?.rank).toEqual({ tier: 'gold', division: 2 });
    expect(d?.standards[0]?.anchors).toHaveLength(1);
    expect(d?.sets[0]?.isBest).toBe(true);
    expect(parseLiftDetail({ rank_key: 'x' })).toBeNull();

    expect(
      parseLiftPercentile({
        percentile: null,
        cohort: 4,
        min_cohort: 20,
        sex: 'male',
        bw_min: 75,
        bw_max: 85,
      }),
    ).toEqual({
      percentile: null,
      cohort: 4,
      minCohort: 20,
      sex: 'male',
      bwMin: 75,
      bwMax: 85,
    });
  });
});

describe('ladder', () => {
  it('turns a score into progress and points to the next division', () => {
    expect(ladderPosition(425, ladder)).toMatchObject({
      tier: 'gold',
      division: 3,
      next: { tier: 'gold', division: 2 },
    });
    expect(ladderPosition(425, ladder).progress).toBeCloseTo(0.5);
    expect(pointsToNext(425, ladder)).toBe(25);
    expect(pointsToNext(990, ladder)).toBeNull();
  });

  it('starts ranges back from now', () => {
    const now = Date.UTC(2026, 9, 9);
    expect(rangeStart('1M', now)).toBe(new Date(now - 30 * 86_400_000).toISOString());
    expect(rangeStart('All', now)).toBe(new Date(0).toISOString());
  });
});

describe('muscle breakdown', () => {
  const m = (
    muscle: ExerciseMuscle['muscle'],
    role: ExerciseMuscle['role'],
    weight: number,
  ): ExerciseMuscle => ({ muscle, role, weight });
  const liftMuscles = {
    backSquat: [m('quads', 'primary', 1), m('glutes', 'primary', 1)],
    romanianDeadlift: [m('hamstrings', 'primary', 1), m('glutes', 'secondary', 0.5)],
    deadlift: [
      m('hamstrings', 'secondary', 0.5),
      m('glutes', 'primary', 1),
      m('lower_back', 'primary', 1),
    ],
  };

  it('splits a muscle into its lifts by share', () => {
    const b = muscleBreakdown(
      'glutes',
      new Map([
        ['backSquat', 500],
        ['romanianDeadlift', 300],
        ['deadlift', 450],
      ]),
      liftMuscles,
      ladder,
    );
    expect(b.contributions.map((c) => c.rankKey).sort()).toEqual([
      'backSquat',
      'deadlift',
      'romanianDeadlift',
    ]);
    expect(b.contributions.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1);
    expect(b.contributions.find((c) => c.rankKey === 'romanianDeadlift')?.share).toBeCloseTo(0.2);
  });

  it('names the weak lift that drags the muscle down', () => {
    const b = muscleBreakdown(
      'hamstrings',
      new Map([
        ['romanianDeadlift', 280],
        ['deadlift', 520],
      ]),
      liftMuscles,
      ladder,
    );
    expect(b.weakestLink).toMatchObject({
      kind: 'raise',
      rankKey: 'romanianDeadlift',
      nextScore: 300,
    });
  });

  it('suggests the main lift for an unranked muscle', () => {
    const b = muscleBreakdown('quads', new Map(), liftMuscles, ladder);
    expect(b).toEqual({ contributions: [], weakestLink: { kind: 'unlock', rankKey: 'backSquat' } });
    expect(muscleBreakdown('calves', new Map(), liftMuscles, ladder).weakestLink).toBeNull();
  });
});

describe('balance', () => {
  it('compares pushing and pulling in tiers', () => {
    const [pushPull, upperLower] = balanceRatios(
      new Map([
        ['benchPress', 500],
        ['overheadPress', 500],
        ['barbellRow', 350],
        ['backSquat', 425],
      ]),
    );
    expect(pushPull).toMatchObject({ ratio: 1.43, status: 'left_heavy' });
    expect(pushPull && balanceSuggestion(pushPull)).toBe(
      'Your pulling lags your pushing by one tier',
    );
    expect(upperLower).toMatchObject({ status: 'balanced' });
    expect(upperLower && balanceSuggestion(upperLower)).toBeNull();
  });

  it('needs a lift on both sides', () => {
    expect(balanceRatios(new Map([['benchPress', 500]]))).toEqual([]);
  });

  it('words tier gaps', () => {
    expect([0.5, 1.1, 2.2, 3.4].map(tierGapWords)).toEqual([
      'half a tier',
      'one tier',
      'two tiers',
      '3 tiers',
    ]);
  });

  it('orders regions by how far they sit above overall', () => {
    const s = regionStandings(
      new Map([
        ['legs', 520],
        ['arms', 380],
        ['back', 450],
      ]),
      450,
    );
    expect(s.map((r) => [r.region, r.delta])).toEqual([
      ['legs', 70],
      ['back', 0],
      ['arms', -70],
    ]);
  });
});

describe('analysis', () => {
  it('counts lift rank-ups by local weekday and time of day', () => {
    const events = [
      event(new Date(2026, 9, 5, 7, 0)), // Monday morning
      event(new Date(2026, 9, 12, 18, 30)), // Monday evening
      event(new Date(2026, 9, 7, 22, 0)), // Wednesday night
      event(new Date(2026, 9, 8, 13, 0), { scope: 'muscle' }), // not a lift
      event(new Date(2026, 9, 9, 13, 0), { kind: 'rank_down' }),
    ];
    expect(rankUpsByWeekday(events)).toEqual([2, 0, 1, 0, 0, 0, 0]);
    expect(rankUpsByDayPart(events)).toEqual([1, 0, 1, 1]);
    expect(peakIndex([0, 3, 3, 1])).toBe(1);
    expect(peakIndex([0, 0])).toBeNull();
  });

  it('shares regions and counts muscles by tier', () => {
    const ranks = [
      rankRow('region', 'legs', 600),
      rankRow('region', 'chest', 200),
      rankRow('muscle', 'quads', 610),
      rankRow('muscle', 'abs', 120),
    ];
    expect(regionShares(ranks).map((r) => [r.region, r.share])).toEqual([
      ['legs', 0.75],
      ['chest', 0.25],
    ]);
    expect(musclesByTier(ranks)).toEqual([
      { tier: 'bronze', count: 1 },
      { tier: 'platinum', count: 1 },
      { tier: 'unranked', count: 18 },
    ]);
  });

  it('picks the lifts closest to their next division', () => {
    const p = (rankKey: string, score: number, target: number | null) =>
      parsePrediction({
        rank_key: rankKey,
        score,
        target_score: target,
        next_tier: target ? 'gold' : null,
        next_division: 3,
      }) as RankPrediction;
    const list = closestPredictions(
      [p('a', 390, 400), p('b', 410, 450), p('c', 960, null), p('d', 349, 350)],
      2,
    );
    expect(list.map((x) => x.rankKey)).toEqual(['d', 'a']);
  });
});

describe('series', () => {
  it('builds a score line with markers and tier bands', () => {
    const now = Date.parse('2026-10-09T00:00:00Z');
    const s = rankSeries(
      {
        snapshots: [
          { at: '2026-09-01T00:00:00Z', score: 380, rank: { tier: 'silver', division: 1 } },
          { at: '2026-09-20T00:00:00Z', score: 430, rank: { tier: 'gold', division: 3 } },
        ],
        events: [
          {
            at: '2026-09-20T00:00:00Z',
            kind: 'rank_up',
            from: { tier: 'silver', division: 1 },
            to: { tier: 'gold', division: 3 },
            score: 430,
          },
        ],
      },
      ladder,
      now,
    );
    expect(s.points).toHaveLength(3);
    expect(s.points[2]).toEqual({ x: now, y: 430 });
    expect(s.markers).toHaveLength(1);
    expect(s.yDomain).toEqual([250, 550]);
    expect(s.bands.map((b) => b.tier)).toEqual(['silver', 'gold']);
  });

  it('captions the latest promotion', () => {
    expect(
      latestPromotion({
        snapshots: [],
        events: [
          {
            at: '2026-09-12T10:00:00Z',
            kind: 'rank_up',
            from: null,
            to: { tier: 'gold', division: 3 },
            score: 400,
          },
        ],
      }),
    ).toBe('Promoted to Gold III on 12 Sept');
  });
});

describe('record grouping', () => {
  it('keeps one "most reps" row in the all view and every weight under the reps filter', () => {
    const rec = (kind: RecordEntry['kind'], weightKg: number | null, value: number) => ({
      exerciseId: 'e',
      exerciseName: 'Bench',
      rankKey: 'benchPress',
      logType: 'weight_reps' as const,
      kind,
      weightKg,
      value,
      previousValue: null,
      achievedAt: '2026-10-01T10:00:00Z',
      workoutId: 'w',
      workoutName: 'Push',
      set: null,
    });
    const entries = [
      rec('reps_at_weight', 60, 8),
      rec('reps_at_weight', 70, 3),
      rec('set_volume', null, 480),
    ];
    const all = groupRecords(entries, { kind: 'all', since: null })[0];
    expect(all?.bests.map((b) => [b.kind, b.weightKg])).toEqual([
      ['reps_at_weight', 70],
      ['set_volume', null],
    ]);
    const reps = groupRecords(entries, { kind: 'reps_at_weight', since: null })[0];
    expect(reps?.bests).toHaveLength(2);
  });
});

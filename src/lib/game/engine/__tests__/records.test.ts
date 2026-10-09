import { rankConfig } from '../../../../../supabase/seed/standards.ts';
import { DAY, makeSet } from '../__fixtures__/sets';
import { flagReason } from '../guardrails';
import { predictLift, linearTrend } from '../predict';
import { detectRecords, type PrKind } from '../records';
import type { EngineSet, RankLiftConfig } from '../types';

const lift = (patch: Partial<RankLiftConfig> = {}): RankLiftConfig => ({
  rankKey: 'benchPress',
  name: 'Bench press',
  discipline: 'weightlifting',
  maxRatio: 4,
  maxReps: null,
  maxHoldSec: null,
  ...patch,
});

describe('personal records', () => {
  const at = (day: number, patch: Partial<EngineSet>) =>
    makeSet({ at: day * DAY, workoutId: `w${day}`, ...patch });
  const kinds = (rows: ReturnType<typeof detectRecords>, workoutId: string) =>
    rows
      .filter((r) => r.workoutId === workoutId && r.previous !== null)
      .map((r) => r.kind)
      .sort();

  it('treats the first time as a baseline, not a PR', () => {
    const rows = detectRecords([at(1, { weightKg: 60, reps: 5 })]);
    expect(rows.every((r) => r.previous === null)).toBe(true);
    expect(rows.map((r) => r.kind).sort()).toEqual(
      ['e1rm', 'reps_at_weight', 'session_volume', 'set_volume', 'weight'].sort(),
    );
  });

  it.each<[string, Partial<EngineSet>[], PrKind[]]>([
    // A new weight starts its own reps-at-weight baseline.
    [
      'heavier for the same reps',
      [{ weightKg: 62.5, reps: 5 }],
      ['e1rm', 'session_volume', 'set_volume', 'weight'],
    ],
    [
      'one more rep at the same weight',
      [{ weightKg: 60, reps: 6 }],
      ['e1rm', 'reps_at_weight', 'session_volume', 'set_volume'],
    ],
    ['the same set again', [{ weightKg: 60, reps: 5 }], []],
    [
      'lighter but more total work',
      [
        { weightKg: 50, reps: 5 },
        { weightKg: 50, reps: 5 },
      ],
      ['session_volume'],
    ],
    ['a lighter set that beats nothing', [{ weightKg: 40, reps: 5 }], []],
  ])('%s', (_, sets, expected) => {
    const rows = detectRecords([
      at(1, { weightKg: 60, reps: 5 }),
      ...sets.map((s, i) => at(2, { ...s, order: i })),
    ]);
    expect(kinds(rows, 'w2')).toEqual([...expected].sort());
  });

  it('keeps reps-at-weight records per weight', () => {
    const rows = detectRecords([
      at(1, { weightKg: 60, reps: 5 }),
      at(2, { weightKg: 70, reps: 3 }),
      at(3, { weightKg: 70, reps: 4 }),
    ]);
    const repsRows = rows.filter((r) => r.kind === 'reps_at_weight');
    expect(repsRows.map((r) => [r.weightKg, r.value, r.previous])).toEqual([
      [60, 5, null],
      [70, 3, null],
      [70, 4, 3],
    ]);
  });

  it('tracks the longest hold and bodyweight reps', () => {
    const rows = detectRecords([
      at(1, {
        logType: 'duration',
        weightMode: 'bodyweight',
        durationSec: 20,
        reps: null,
        weightKg: null,
      }),
      at(2, {
        logType: 'duration',
        weightMode: 'bodyweight',
        durationSec: 25,
        reps: null,
        weightKg: null,
      }),
      at(3, {
        logType: 'bodyweight_reps',
        weightMode: 'bodyweight',
        weightKg: 0,
        reps: 8,
        exerciseId: 'pull',
      }),
      at(4, {
        logType: 'bodyweight_reps',
        weightMode: 'bodyweight',
        weightKg: 0,
        reps: 10,
        exerciseId: 'pull',
      }),
    ]);
    expect(kinds(rows, 'w2')).toEqual(['hold']);
    expect(kinds(rows, 'w4')).toEqual(['reps_at_weight']);
  });

  it('ignores warm-ups, failed and assisted sets', () => {
    const rows = detectRecords([
      at(1, { weightKg: 60, reps: 5 }),
      at(2, { weightKg: 100, reps: 5, setType: 'warmup' }),
      at(2, { weightKg: 100, reps: 5, failed: true }),
      at(2, { weightKg: 20, reps: 12, weightMode: 'assisted' }),
    ]);
    expect(kinds(rows, 'w2')).toEqual([]);
  });
});

describe('guardrails', () => {
  it.each<[string, Partial<EngineSet>, RankLiftConfig | null, number | null, string | null]>([
    ['a normal bench', { weightKg: 100, reps: 5 }, lift(), 80, null],
    ['bench over 4× bodyweight', { weightKg: 330, reps: 1 }, lift(), 80, 'e1rm_over_limit'],
    ['high reps judged as 10', { weightKg: 260, reps: 20 }, lift(), 80, 'e1rm_over_limit'],
    [
      '101 loaded reps on a machine',
      { weightKg: 20, reps: 101, rankKey: null },
      null,
      null,
      'reps_over_limit',
    ],
    ['100 loaded reps', { weightKg: 20, reps: 100, rankKey: null }, null, null, null],
    [
      'too many pull-ups',
      { logType: 'weighted_bodyweight', weightMode: 'bodyweight', weightKg: 0, reps: 90 },
      lift({ maxRatio: 3.2, maxReps: 80 }),
      70,
      'reps_over_limit',
    ],
    [
      'an endless front lever',
      { logType: 'duration', weightMode: 'bodyweight', durationSec: 300, reps: null },
      lift({ maxRatio: null, maxHoldSec: 120 }),
      null,
      'hold_over_limit',
    ],
    ['no weigh-in: ratio unchecked', { weightKg: 330, reps: 1 }, lift(), null, null],
    ['warm-ups are never flagged', { weightKg: 330, reps: 1, setType: 'warmup' }, lift(), 80, null],
  ])('%s', (_, patch, cfg, bw, expected) => {
    expect(flagReason(makeSet(patch), cfg, bw)).toBe(expected);
  });
});

describe('predictions', () => {
  const now = 100 * DAY;
  const base = {
    config: rankConfig,
    rankKey: 'benchPress' as const,
    sex: 'male' as const,
    ageFactor: 1,
    bodyweightKg: 75,
    now,
  };

  it('converts the next division into loads at 1, 3, 5 and 8 reps', () => {
    const p = predictLift({ ...base, score: 420, history: [] });
    expect(p.next).toEqual({ tier: 'gold', division: 2 });
    expect(p.targetScore).toBe(450);
    expect(p.loads.map((l) => l.reps)).toEqual([1, 3, 5, 8]);
    const [one, three, five, eight] = p.loads.map((l) => l.kg);
    expect(one).toBeGreaterThan(three ?? 0);
    expect(five).toBeGreaterThan(eight ?? 0);
    // Loads are rounded up to 0.5 kg.
    expect(p.loads.every((l) => Number.isInteger(l.kg * 2))).toBe(true);
    expect(p.eta).toEqual({ status: 'need_more_sessions' });
  });

  it('estimates days from the 8-week e1RM trend', () => {
    // +0.5 kg e1RM a week from 60 kg (62 kg today); the next division needs p.e1rmKg.
    const history = [0, 7, 14, 21, 28].map((d) => ({
      at: now - (28 - d) * DAY,
      value: 60 + d / 14,
    }));
    const p = predictLift({ ...base, score: 420, history });
    expect(p.eta.status).toBe('ok');
    const days = p.eta.status === 'ok' ? p.eta.days : 0;
    expect(days).toBeGreaterThan(0);
    expect(Math.abs(days - ((p.e1rmKg ?? 0) - 62) * 14)).toBeLessThan(2);
  });

  it('says when the trend is flat or there is nothing above', () => {
    const flat = [0, 1, 2, 3].map((w) => ({ at: now - w * 7 * DAY, value: 90 }));
    expect(predictLift({ ...base, score: 420, history: flat }).eta).toEqual({
      status: 'not_trending',
    });
    expect(predictLift({ ...base, score: 980, history: [] }).eta).toEqual({ status: 'at_top' });
  });

  it('gives reps, added load or seconds for calisthenics', () => {
    const pull = predictLift({ ...base, rankKey: 'pullUp', score: 260, history: [] });
    expect(pull.reps).toBe(7);
    expect(pull.addedLoads).toHaveLength(4);
    const lever = predictLift({ ...base, rankKey: 'frontLever', score: 860, history: [] });
    // Master II starts at 883.33: 3 s + a third of the way to 15 s.
    expect(lever.seconds).toBe(7);
  });

  it('fits a straight line', () => {
    const pts = [0, 1, 2, 3].map((i) => ({ at: now - (3 - i) * DAY, value: 10 + 2 * i }));
    expect(linearTrend(pts, now)).toEqual({ slopePerDay: 2, valueNow: 16 });
    expect(linearTrend(pts.slice(0, 3), now)).toBeNull();
  });
});

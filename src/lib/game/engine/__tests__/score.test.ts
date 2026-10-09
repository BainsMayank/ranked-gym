import { exercises } from '../../../../../supabase/seed/exercises.ts';
import { rankConfig } from '../../../../../supabase/seed/standards.ts';
import { validateStandards } from '../../../../../supabase/seed/standards/validate.ts';
import { loadForE1rm } from '../e1rm';
import {
  ageFactor,
  closestBodyweight,
  resolveStandard,
  scoreForValue,
  scoreSet,
  valueForScore,
} from '../score';
import { tierFor } from '../tiers';
import type { EngineSet, ProfileSex, StandardsSex } from '../types';
import { makeSet } from '../__fixtures__/sets';

const config = rankConfig;

/** e1RM (kg) needed to reach a score on a weightlifting lift. */
function e1rmFor(key: EngineSet['rankKey'], score: number, bw: number, sex: ProfileSex): number {
  const std = resolveStandard(config.standards, key ?? 'benchPress', '', 'e1rm_ratio', sex, bw);
  if (!std) throw new Error(`no standard for ${key}`);
  return valueForScore(std, score) * bw;
}

const tierOfLift = (
  key: EngineSet['rankKey'],
  kg: number,
  reps: number,
  bw: number,
  sex: ProfileSex = 'male',
) => {
  const s = scoreSet(
    config,
    makeSet({ rankKey: key, weightKg: kg, reps }),
    { sex, ageFactor: 1 },
    bw,
  );
  return tierFor(s.score ?? 0, config.thresholds).tier;
};

describe('standards v1', () => {
  it('pass validation', () => {
    expect(validateStandards(config, exercises)).toEqual([]);
  });

  it('match the published tables for a 75 kg man (tier starts, e1RM kg)', () => {
    const cases: [EngineSet['rankKey'], number[]][] = [
      ['benchPress', [42.5, 57.5, 72.5, 90, 110, 137.5, 177.5]],
      ['backSquat', [57.5, 80, 100, 122.5, 150, 190, 245]],
      ['deadlift', [65, 90, 112.5, 137.5, 170, 215, 275]],
      ['overheadPress', [27.5, 37.5, 47.5, 57.5, 72.5, 90, 115]],
    ];
    const anchors = [100, 250, 400, 550, 700, 850, 950];
    for (const [key, kgs] of cases) {
      anchors.forEach((score, i) => {
        expect(Math.abs(e1rmFor(key, score, 75, 'male') - (kgs[i] ?? 0))).toBeLessThan(1.3);
      });
    }
  });

  // ExRx (Kilgore) bench standards for a 75 kg man, by training age.
  it.each([
    [40, 'iron', 'untrained, first week'],
    [50, 'bronze', 'untrained'],
    [66, 'silver', 'novice (3–9 months)'],
    [82, 'gold', 'intermediate (~2 years)'],
    [100, 'platinum', 'advanced (3–5 years)'],
    [127, 'diamond', 'elite'],
    [160, 'master', 'national-level'],
  ])('a %p kg bench is %s (%s)', (kg, tier) => {
    expect(tierOfLift('benchPress', kg, 1, 75)).toBe(tier);
  });

  it('make world-record lifts Champion', () => {
    expect(tierOfLift('backSquat', 300, 1, 74)).toBe('champion');
    expect(tierOfLift('benchPress', 225, 1, 83)).toBe('champion');
    expect(tierOfLift('deadlift', 410, 1, 120)).toBe('champion');
    expect(tierOfLift('backSquat', 200, 1, 57, 'female')).toBe('champion');
    expect(tierOfLift('benchPress', 130, 1, 63, 'female')).toBe('champion');
  });

  it('need more kg but a lower multiple of bodyweight as bodyweight rises', () => {
    const at = (bw: number) => e1rmFor('backSquat', 400, bw, 'male');
    expect(at(90)).toBeGreaterThan(at(60));
    expect(at(90) / 90).toBeLessThan(at(60) / 60);
  });

  it('blend smoothly between bodyweight bands (no jump at a band edge)', () => {
    const below = e1rmFor('benchPress', 400, 74.99, 'male');
    const above = e1rmFor('benchPress', 400, 75.01, 'male');
    expect(Math.abs(above - below)).toBeLessThan(0.05);
  });
});

describe('sex and age', () => {
  it('ranks "rather not say" on the average of both curves', () => {
    const value = (sex: ProfileSex) =>
      resolveStandard(config.standards, 'benchPress', '', 'e1rm_ratio', sex, 70)?.values ?? [];
    const male = value('male');
    const female = value('female');
    value('unspecified').forEach((v, i) =>
      expect(v).toBeCloseTo(((male[i] ?? 0) + (female[i] ?? 0)) / 2, 9),
    );
  });

  it.each([
    [null, 1],
    [14, 1.15],
    [17, 1.06],
    [21, 1],
    [37, 1.02],
    [45, 1.08],
    [55, 1.18],
    [70, 1.32],
  ])('age %p → factor %p', (age, factor) => {
    expect(ageFactor(age, config.ageBrackets)).toBe(factor);
  });

  it('applies the age factor to the measured value', () => {
    const set = makeSet({ rankKey: 'benchPress', weightKg: 80, reps: 1 });
    const young = scoreSet(config, set, { sex: 'male', ageFactor: 1 }, 75).score ?? 0;
    const older = scoreSet(config, set, { sex: 'male', ageFactor: 1.08 }, 75).score ?? 0;
    const std = resolveStandard(config.standards, 'benchPress', '', 'e1rm_ratio', 'male', 75);
    expect(older).toBeCloseTo(scoreForValue(std!, (80 * 1.08) / 75), 9);
    expect(older).toBeGreaterThan(young);
  });
});

describe('which sets rank', () => {
  const lifter = { sex: 'male' as const, ageFactor: 1 };
  it.each<[string, Partial<EngineSet>]>([
    ['warm-ups', { setType: 'warmup' }],
    ['failed sets', { failed: true }],
    ['unticked sets', { completed: false }],
    ['unranked exercises', { rankKey: null }],
    ['assisted sets', { weightMode: 'assisted' }],
    ['above 10 reps (weight lifts)', { reps: 12 }],
  ])('not %s', (_, patch) => {
    expect(
      scoreSet(config, makeSet({ rankKey: 'benchPress', ...patch }), lifter, 75).score,
    ).toBeNull();
  });

  it('asks for a weigh-in when a weighted set has none nearby', () => {
    const set = makeSet({ rankKey: 'benchPress' });
    expect(scoreSet(config, set, lifter, null)).toEqual({ score: null, needsBodyweight: true });
  });

  it('finds the closest weigh-in within 30 days (later wins a tie)', () => {
    const day = 86_400_000;
    const logs = [
      { weightKg: 70, at: 0 },
      { weightKg: 72, at: 20 * day },
      { weightKg: 74, at: 40 * day },
    ];
    expect(closestBodyweight(logs, 25 * day, 30)).toBe(72);
    expect(closestBodyweight(logs, 30 * day, 30)).toBe(74);
    expect(closestBodyweight(logs, 75 * day, 30)).toBeNull();
  });
});

describe('calisthenics', () => {
  const score = (patch: Partial<EngineSet>, sex: StandardsSex = 'male', bw: number | null = 75) =>
    scoreSet(config, makeSet(patch), { sex, ageFactor: 1 }, bw);
  const tier = (s: { score: number | null }) => tierFor(s.score ?? 0, config.thresholds).tier;
  const pullUp = (reps: number, weightKg = 0): Partial<EngineSet> => ({
    rankKey: 'pullUp',
    logType: 'weighted_bodyweight',
    weightMode: 'bodyweight',
    weightKg,
    reps,
  });

  it('scores clean reps without a weigh-in', () => {
    expect(tier(score(pullUp(1), 'male', null))).toBe('bronze');
    expect(tier(score(pullUp(5), 'male', null))).toBe('silver');
    expect(tier(score(pullUp(1), 'female', null))).toBe('silver');
    expect(tier(score(pullUp(25), 'male', null))).toBe('diamond');
  });

  it('agrees between the reps and ratio tables up to 10 reps', () => {
    const reps =
      scoreSet(config, makeSet(pullUp(10)), { sex: 'male', ageFactor: 1 }, null).score ?? 0;
    const both = score(pullUp(10)).score ?? 0;
    expect(Math.abs(both - reps)).toBeLessThan(15);
  });

  it('converts weighted reps to an e1RM of bodyweight + added', () => {
    // 75 kg man, +75 kg for a single = ratio 2.0 = Master.
    expect(tier(score(pullUp(1, 75)))).toBe('master');
    expect(score(pullUp(3, 20)).score).toBeGreaterThan(score(pullUp(3)).score ?? 0);
  });

  it('never scores assisted work', () => {
    expect(score({ ...pullUp(8), weightMode: 'assisted' }).score).toBeNull();
    expect(score({ ...pullUp(8), logType: 'assisted_bodyweight' }).score).toBeNull();
  });

  it('scores holds, with progressions capped below the full skill', () => {
    const hold = (variant: string, seconds: number) =>
      score({
        rankKey: 'frontLever',
        variant,
        logType: 'duration',
        weightMode: 'bodyweight',
        durationSec: seconds,
      });
    expect(tier(hold('tuck-front-lever', 15))).toBe('silver');
    expect(hold('tuck-front-lever', 600).score).toBe(450);
    expect(tier(hold('', 1))).toBe('diamond');
    expect(tier(hold('', 3))).toBe('master');
    expect(tier(hold('', 20))).toBe('champion');
  });

  it('scores the L-sit, planche and handstand tables', () => {
    const hold = (rankKey: EngineSet['rankKey'], variant: string, s: number) =>
      tier(
        score({ rankKey, variant, logType: 'duration', weightMode: 'bodyweight', durationSec: s }),
      );
    expect(hold('lSit', '', 10)).toBe('gold');
    expect(hold('planche', 'tuck-planche', 10)).toBe('gold');
    expect(hold('handstand', '', 30)).toBe('platinum');
    expect(hold('handstand', 'wall-handstand', 999)).toBe('gold');
  });
});

describe('predictions invert scoring', () => {
  it('the load for the next anchor scores exactly that anchor', () => {
    const e1rm = e1rmFor('benchPress', 550, 80, 'male');
    const kg = loadForE1rm(e1rm, 5);
    const s = scoreSet(
      config,
      makeSet({ rankKey: 'benchPress', weightKg: kg, reps: 5 }),
      { sex: 'male', ageFactor: 1 },
      80,
    );
    expect(s.score).toBeCloseTo(550, 6);
  });
});

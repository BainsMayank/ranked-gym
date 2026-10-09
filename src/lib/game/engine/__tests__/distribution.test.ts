import { exercises } from '../../../../../supabase/seed/exercises.ts';
import {
  distributionTable,
  makeFakeUsers,
  rankFakeUsers,
  type FakeResult,
  type PersonaLevel,
} from '../../../../../supabase/seed/fakeUsers.ts';
import { rankConfig } from '../../../../../supabase/seed/standards.ts';
import type { Tier } from '../types';

/**
 * 50 fake lifters with realistic histories (supabase/seed/fakeUsers.ts) run through the engine.
 * The table prints with every run so a rebalance shows its effect at a glance; the same people run
 * through Postgres in supabase/tests/database/08_rank_distribution.test.sql.
 */
const results = rankFakeUsers(
  makeFakeUsers(),
  rankConfig,
  exercises,
  new Date(Date.UTC(2026, 9, 8)),
);

const share = (level: PersonaLevel, tiers: Tier[]) => {
  const rows = results.filter((r: FakeResult) => r.user.level === level);
  return (
    rows.filter((r) => r.overallTier !== null && tiers.includes(r.overallTier)).length / rows.length
  );
};

describe('fake-user tier distribution', () => {
  it('prints the distribution', () => {
    console.log(
      `Overall rank by experience (50 fake lifters)\n${distributionTable(results).join('\n')}`,
    );
    expect(results).toHaveLength(50);
  });

  it('places everyone (5+ lifts over 4+ regions)', () => {
    expect(results.filter((r) => r.overallTier === null)).toHaveLength(0);
  });

  it('puts most beginners in Iron–Silver', () => {
    expect(share('beginner', ['iron', 'bronze', 'silver'])).toBeGreaterThanOrEqual(0.8);
  });

  it('puts most 1–2 year lifters in Gold–Platinum', () => {
    expect(share('intermediate', ['gold', 'platinum'])).toBeGreaterThanOrEqual(0.6);
  });

  it('keeps Master and Champion rare', () => {
    expect(
      results.filter((r) => r.overallTier === 'master' || r.overallTier === 'champion').length,
    ).toBeLessThanOrEqual(2);
  });
});

import { isRankKey, rankKeys } from '@/lib/game';

import { rankConfig } from '../../../../supabase/seed/standards.ts';

describe('rankKeys', () => {
  it('has no duplicates', () => {
    expect(new Set(rankKeys).size).toBe(rankKeys.length);
  });

  it('has a standard for every key, and only for keys', () => {
    for (const lift of rankConfig.lifts) expect(isRankKey(lift.rankKey)).toBe(true);
    expect(rankConfig.lifts).toHaveLength(rankKeys.length);
  });
});

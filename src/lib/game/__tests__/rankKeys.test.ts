import { isRankKey, rankKeys, rankedLifts } from '@/lib/game';

describe('rankKeys', () => {
  it('has no duplicates', () => {
    expect(new Set(rankKeys).size).toBe(rankKeys.length);
  });

  it('covers every lift that has a standard', () => {
    for (const lift of Object.keys(rankedLifts)) expect(isRankKey(lift)).toBe(true);
  });
});

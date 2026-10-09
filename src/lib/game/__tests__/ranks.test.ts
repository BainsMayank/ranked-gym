import { compareRanks, rankFromServer, rankLabel, rankOrdinal } from '../ranks';

describe('rank model', () => {
  it('labels tiers with roman divisions, except Champion', () => {
    expect(rankLabel('gold', 2)).toBe('Gold II');
    expect(rankLabel('master', 3)).toBe('Master III');
    expect(rankLabel('iron')).toBe('Iron');
    expect(rankLabel('champion', 1)).toBe('Champion');
  });

  it('orders the whole ladder from Iron III up to Champion (same as rank_ordinal)', () => {
    expect(rankOrdinal({ tier: 'iron', division: 3 })).toBe(0);
    expect(rankOrdinal({ tier: 'iron', division: 1 })).toBe(2);
    expect(rankOrdinal({ tier: 'bronze', division: 3 })).toBe(3);
    expect(rankOrdinal({ tier: 'master', division: 1 })).toBe(20);
    expect(rankOrdinal({ tier: 'champion' })).toBe(21);
  });

  it('compares ranks across tiers and divisions', () => {
    expect(
      compareRanks({ tier: 'gold', division: 1 }, { tier: 'platinum', division: 3 }),
    ).toBeLessThan(0);
    expect(
      compareRanks({ tier: 'gold', division: 2 }, { tier: 'gold', division: 3 }),
    ).toBeGreaterThan(0);
    expect(compareRanks({ tier: 'silver', division: 2 }, { tier: 'silver', division: 2 })).toBe(0);
  });

  it('reads server ranks', () => {
    expect(rankFromServer('gold', 2)).toEqual({ tier: 'gold', division: 2 });
    expect(rankFromServer('champion', null)).toEqual({ tier: 'champion' });
    expect(rankFromServer(null, null)).toBeNull();
  });
});

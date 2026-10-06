import { compareRanks, rankLabel, rankOrdinal } from '../ranks';

describe('rank model', () => {
  it('labels tiers with roman divisions, except tiers without divisions', () => {
    expect(rankLabel('gold', 2)).toBe('Gold II');
    expect(rankLabel('iron')).toBe('Iron');
    expect(rankLabel('master', 1)).toBe('Master');
  });

  it('orders the whole ladder from Iron IV up to Champion', () => {
    expect(rankOrdinal({ tier: 'iron', division: 4 })).toBe(0);
    expect(rankOrdinal({ tier: 'iron', division: 1 })).toBe(3);
    expect(rankOrdinal({ tier: 'bronze', division: 4 })).toBe(4);
    expect(rankOrdinal({ tier: 'master' })).toBe(24);
    expect(rankOrdinal({ tier: 'champion' })).toBe(25);
  });

  it('compares ranks across tiers and divisions', () => {
    expect(
      compareRanks({ tier: 'gold', division: 1 }, { tier: 'platinum', division: 4 }),
    ).toBeLessThan(0);
    expect(
      compareRanks({ tier: 'gold', division: 2 }, { tier: 'gold', division: 3 }),
    ).toBeGreaterThan(0);
    expect(compareRanks({ tier: 'silver', division: 2 }, { tier: 'silver', division: 2 })).toBe(0);
  });
});

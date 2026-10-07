import { suggestUsername } from '../suggestUsername';

describe('suggestUsername', () => {
  it('builds a valid username from a name or email', () => {
    expect(suggestUsername('Āsha Rao')).toBe('asha_rao');
    expect(suggestUsername('rohit.k+gym')).toBe('rohit_k_gym');
    expect(suggestUsername('  Dev  ')).toBe('dev');
    expect(suggestUsername('A very long display name indeed')).toBe('a_very_long_display');
  });

  it('returns empty when too short or not latin', () => {
    expect(suggestUsername('Al')).toBe('');
    expect(suggestUsername('अनु')).toBe('');
  });
});

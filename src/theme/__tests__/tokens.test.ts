import {
  colorTokenNames,
  cssVarName,
  hexToRgbChannels,
  palette,
  rankColors,
  rankTiers,
} from '../tokens';

describe('theme tokens', () => {
  it.each(['dark', 'light'] as const)('%s palette defines every colour token as hex', (scheme) => {
    for (const token of colorTokenNames) {
      expect(palette[scheme][token]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('has 8 rank tiers from Iron to Champion, each with colours', () => {
    expect(rankTiers).toEqual([
      'iron',
      'bronze',
      'silver',
      'gold',
      'platinum',
      'diamond',
      'master',
      'champion',
    ]);
    for (const tier of rankTiers) {
      expect(rankColors[tier].base).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('converts hex to space-separated RGB channels', () => {
    expect(hexToRgbChannels('#B8F536')).toBe('184 245 54');
    expect(hexToRgbChannels('#fff')).toBe('255 255 255');
  });

  it('builds kebab-case CSS variable names', () => {
    expect(cssVarName('surfaceRaised')).toBe('--color-surface-raised');
    expect(cssVarName('primary')).toBe('--color-primary');
  });
});

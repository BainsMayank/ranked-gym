import {
  colorTokenNames,
  cssVarName,
  hexToRgbChannels,
  palette,
  rankColors,
  rankTiers,
} from '../tokens';
import { srgbToP3Hex } from '../displayColor';

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

describe('Expo Go colour correction', () => {
  it('maps sRGB to the P3 value that displays the same colour', () => {
    // Pure sRGB red sits inside P3 at about (0.918, 0.200, 0.139).
    expect(srgbToP3Hex('#FF0000')).toBe('#EA3323');
    expect(srgbToP3Hex('#9B9B9B')).toBe('#9B9B9B');
  });
});

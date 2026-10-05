/**
 * Design tokens — the ONLY place raw colour values may live.
 * Consumed by tailwind.config.js (classes), ThemeProvider (CSS vars) and useTheme() (raw values).
 * Keep this file dependency-free: it is also loaded by Node (Tailwind, app.config.ts).
 */

export const colorTokenNames = [
  'background',
  'surface',
  'surfaceRaised',
  'border',
  'text',
  'textMuted',
  'primary',
  'onPrimary',
  'success',
  'warning',
  'danger',
  'onDanger',
  'scrim',
] as const;

export type ColorToken = (typeof colorTokenNames)[number];
export type ColorScheme = 'dark' | 'light';
export type Palette = Record<ColorToken, string>;

export const palette: Record<ColorScheme, Palette> = {
  dark: {
    background: '#0B0D12',
    surface: '#151922',
    surfaceRaised: '#1E2430',
    border: '#2A3140',
    text: '#F4F6FA',
    textMuted: '#9AA3B2',
    primary: '#B8F536',
    onPrimary: '#0B0D12',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#F43F5E',
    onDanger: '#FFFFFF',
    scrim: '#000000',
  },
  light: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceRaised: '#EEF0F4',
    border: '#DDE1E8',
    text: '#0F1218',
    textMuted: '#5B6475',
    primary: '#4D7C0F',
    onPrimary: '#FFFFFF',
    success: '#15803D',
    warning: '#B45309',
    danger: '#BE123C',
    onDanger: '#FFFFFF',
    scrim: '#000000',
  },
};

export const rankTiers = [
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'champion',
] as const;

export type RankTier = (typeof rankTiers)[number];

/** Rank colours are identical in both schemes so a tier is always recognisable. */
export const rankColors: Record<RankTier, { base: string; highlight: string; on: string }> = {
  iron: { base: '#6B7280', highlight: '#A3AAB6', on: '#FFFFFF' },
  bronze: { base: '#B4693A', highlight: '#E3A274', on: '#FFFFFF' },
  silver: { base: '#9AA6B6', highlight: '#E2E8F0', on: '#0F1218' },
  gold: { base: '#E0A91B', highlight: '#FCE38A', on: '#0F1218' },
  platinum: { base: '#22A99A', highlight: '#8CEBDD', on: '#0F1218' },
  diamond: { base: '#4C8DFF', highlight: '#A9C8FF', on: '#FFFFFF' },
  master: { base: '#9B5CFF', highlight: '#D2B6FF', on: '#FFFFFF' },
  champion: { base: '#FF4D5E', highlight: '#FFB36B', on: '#FFFFFF' },
};

/** 4pt spacing scale (px). Tailwind numeric spacing also works: p-4 = 16px. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export type TypeVariant =
  'display' | 'title' | 'heading' | 'subheading' | 'body' | 'label' | 'caption';

export const typography: Record<
  TypeVariant,
  { fontSize: number; lineHeight: number; fontWeight: '400' | '500' | '600' | '700' | '800' }
> = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  subheading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

export type ShadowLevel = 'none' | 'sm' | 'md' | 'lg';

export const shadows: Record<
  ShadowLevel,
  {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  }
> = {
  none: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
};

/** '#B8F536' → '184 245 54' (space-separated channels for `rgb(var(--x) / <alpha-value>)`). */
export function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** CSS var name for a colour token, e.g. surfaceRaised → --color-surface-raised. */
export function cssVarName(token: ColorToken): string {
  return `--color-${token.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

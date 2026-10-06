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
  /** Lighter top edge on raised surfaces: the "lit from above" line that gives cards depth. */
  'edge',
  'text',
  'textMuted',
  'primary',
  'onPrimary',
  'success',
  'warning',
  /** Streak flame. Same value as warning today (a streak at risk is a warning); kept separate so it can diverge. */
  'streak',
  'danger',
  'onDanger',
  'scrim',
] as const;

export type ColorToken = (typeof colorTokenNames)[number];
export type ColorScheme = 'dark' | 'light';
export type Palette = Record<ColorToken, string>;

/**
 * Calm chrome, loud rewards: the interface is near-black neutrals plus ONE orange signal colour.
 * Saturated colour belongs to game objects (ranks, rarities), never to chrome.
 */
export const palette: Record<ColorScheme, Palette> = {
  dark: {
    background: '#0B0B0C',
    surface: '#161618',
    surfaceRaised: '#202023',
    border: '#2C2C30',
    edge: '#34343A',
    text: '#F4F4F5',
    textMuted: '#9B9BA1',
    primary: '#F2662F',
    onPrimary: '#0B0B0C',
    success: '#5BC48A',
    warning: '#FF9F43',
    streak: '#FF9F43',
    danger: '#E5484D',
    onDanger: '#0B0B0C',
    scrim: '#000000',
  },
  light: {
    background: '#F5F5F6',
    surface: '#FFFFFF',
    surfaceRaised: '#EBEBED',
    border: '#DCDCDF',
    edge: '#FFFFFF',
    text: '#0F0F11',
    textMuted: '#5F5F66',
    primary: '#C2491A',
    onPrimary: '#FFFFFF',
    success: '#1E8A55',
    warning: '#A85D0C',
    streak: '#A85D0C',
    danger: '#C9302C',
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

/** A game-object colour: `base` fill, `highlight` for gradients and glows, `on` for text/marks drawn on `base`. */
export interface GameColor {
  base: string;
  highlight: string;
  on: string;
}

/** Rank colours are identical in both schemes so a tier is always recognisable. Metallic, tuned for near-black. */
export const rankColors: Record<RankTier, GameColor> = {
  iron: { base: '#7A7A82', highlight: '#B4B4BB', on: '#0B0B0C' },
  bronze: { base: '#B9773F', highlight: '#E2AE7E', on: '#0B0B0C' },
  silver: { base: '#B9C2CE', highlight: '#E8EDF3', on: '#0B0B0C' },
  gold: { base: '#E4B53F', highlight: '#F8DE8C', on: '#0B0B0C' },
  platinum: { base: '#4FC3D9', highlight: '#A6EAF5', on: '#0B0B0C' },
  diamond: { base: '#5E9BFF', highlight: '#B3D0FF', on: '#0B0B0C' },
  master: { base: '#A67CFF', highlight: '#D7C4FF', on: '#0B0B0C' },
  champion: { base: '#F2662F', highlight: '#FFB547', on: '#0B0B0C' },
};

/** Rarity for badges, cosmetics, avatar frames and rewards. Reuses rank hues so the game has one colour language. */
export const rarities = ['common', 'rare', 'epic', 'legendary'] as const;

export type Rarity = (typeof rarities)[number];

export const rarityColors: Record<Rarity, GameColor> = {
  common: rankColors.iron,
  rare: rankColors.diamond,
  epic: rankColors.master,
  legendary: { base: '#FFB547', highlight: '#FFE0A3', on: '#0B0B0C' },
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

/** Shape lock, applied by role: sm tags · md controls · lg cards · xl sheets and bars. */
export const radius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

/** Instrument Sans, loaded in app/_layout.tsx before the splash hides. Each weight is its own family on Android. */
export const fontFamilies = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
} as const;

export type FontWeightName = keyof typeof fontFamilies;

export type TypeVariant =
  | 'hero'
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'label'
  | 'caption'
  | 'overline';

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  weight: FontWeightName;
  letterSpacing: number;
  uppercase?: boolean;
}

/** Weight comes from size, not heaviness: nothing above semibold. */
export const typography: Record<TypeVariant, TypeStyle> = {
  hero: { fontSize: 64, lineHeight: 68, weight: 'semibold', letterSpacing: -1.6 },
  display: { fontSize: 40, lineHeight: 46, weight: 'semibold', letterSpacing: -0.8 },
  title: { fontSize: 28, lineHeight: 34, weight: 'semibold', letterSpacing: -0.4 },
  heading: { fontSize: 20, lineHeight: 26, weight: 'medium', letterSpacing: -0.2 },
  subheading: { fontSize: 17, lineHeight: 22, weight: 'medium', letterSpacing: 0 },
  body: { fontSize: 15, lineHeight: 22, weight: 'regular', letterSpacing: 0 },
  label: { fontSize: 13, lineHeight: 18, weight: 'medium', letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, weight: 'regular', letterSpacing: 0 },
  overline: { fontSize: 11, lineHeight: 14, weight: 'medium', letterSpacing: 1.3, uppercase: true },
};

export type ShadowLevel = 'none' | 'sm' | 'md' | 'lg';

/** Each level pairs iOS shadow props with Android elevation. Depth on dark comes mostly from surface steps + `edge`. */
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 36,
    elevation: 16,
  },
};

/** Motion posture: springy press feedback, short state transitions. Decorative motion collapses under reduced motion. */
export const motion = {
  press: { scale: 0.97, damping: 18, stiffness: 320 },
  duration: { fast: 150, base: 240, slow: 400 },
} as const;

/** Glass chrome (tab bar). iOS blurs; Android shows `surface` at `fallbackOpacity` (no BlurTargetView, for performance). */
export const glass = {
  intensity: 50,
  fallbackOpacity: 0.94,
} as const;

/** '#F2662F' → '242 102 47' (space-separated channels for `rgb(var(--x) / <alpha-value>)`). */
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

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import {
  palette as srgbPalette,
  rankColors as srgbRankColors,
  rarityColors as srgbRarityColors,
  type ColorScheme,
  type GameColor,
  type Palette,
} from './tokens';

/**
 * Expo Go on iOS reads hex colours as Display P3, which makes every token look more saturated
 * than designed (measured: #F2662F rendered as #FF5A0B). React Native's own default is sRGB,
 * so dev and store builds are expected to render the tokens as written; re-check this when we
 * move to dev builds. Inside Expo Go on iOS only, convert each sRGB token to the P3 value that
 * displays the same colour. Tokens stay in sRGB.
 */
const needsCorrection =
  Platform.OS === 'ios' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** Linear sRGB → linear Display P3 (same D65 white point). */
const SRGB_TO_P3: readonly (readonly number[])[] = [
  [0.8224621, 0.177538, 0],
  [0.0331941, 0.9668058, 0],
  [0.0170827, 0.0723974, 0.9105199],
];

export function srgbToP3Hex(hex: string): string {
  const rgb = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  return `#${SRGB_TO_P3.map((row) => {
    const linear = row.reduce((sum, k, i) => sum + k * (rgb[i] ?? 0), 0);
    const byte = Math.round(Math.min(1, Math.max(0, toGamma(linear))) * 255);
    return byte.toString(16).padStart(2, '0');
  }).join('')}`.toUpperCase();
}

const fix = needsCorrection ? srgbToP3Hex : (hex: string) => hex;

function mapValues<K extends string, V, R>(obj: Record<K, V>, fn: (v: V) => R): Record<K, R> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v as V)])) as Record<K, R>;
}

const fixGame = (c: GameColor): GameColor => ({
  base: fix(c.base),
  highlight: fix(c.highlight),
  on: fix(c.on),
});

export const palette: Record<ColorScheme, Palette> = mapValues(srgbPalette, (p) =>
  mapValues(p, fix),
);
export const rankColors = mapValues(srgbRankColors, fixGame);
export const rarityColors = mapValues(srgbRarityColors, fixGame);

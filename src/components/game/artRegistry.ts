import type { ComponentType } from 'react';
import type { ImageSourcePropType } from 'react-native';

import type { RankDivision } from '@/lib/game/ranks';
import type { RankTier } from '@/theme';

/**
 * Plug-in points for final game art. Components render whatever is registered here and fall back to
 * placeholder art when nothing is, so art can land tier by tier without touching any screen.
 *
 * How to add rank art (PNG/WebP exported at 3x, square, transparent):
 *   1. Put files in assets/ranks/, e.g. gold.png or gold-2.png for a per-division variant.
 *   2. Register: gold: { kind: 'image', source: require('../../../assets/ranks/gold.png') }
 *      (add `byDivision: { 2: require(...) }` for per-division art).
 *   3. For vector or animated art, register { kind: 'component', Component } instead
 *      (react-native-svg today; Skia or Lottie once they're approved).
 */

export interface GameArtProps {
  size: number;
}

export type GameArt<P extends GameArtProps = GameArtProps> =
  | { kind: 'image'; source: ImageSourcePropType }
  | { kind: 'component'; Component: ComponentType<P> };

export interface RankArtProps extends GameArtProps {
  division?: RankDivision;
}

export type RankArt = GameArt<RankArtProps> & {
  /** Optional per-division images; falls back to `source` for divisions not listed. */
  byDivision?: Partial<Record<RankDivision, ImageSourcePropType>>;
};

export const rankArt: Partial<Record<RankTier, RankArt>> = {};

/**
 * Avatar frames (cosmetics earned from challenges, seasons, leagues), keyed by cosmetic id from the server.
 * Frame art is drawn over the avatar, so leave a transparent centre sized for the avatar circle.
 */
export const avatarFrameArt: Record<string, GameArt> = {};

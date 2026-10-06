import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { rankColors, type RankTier } from '@/theme';

export interface RankGlowProps {
  tier: RankTier;
  /** 0 → 1, default is a quiet 0.18. Celebrations can go higher. */
  intensity?: number;
}

/**
 * Soft radial glow in a tier's colour, placed behind hero rank content and celebration moments.
 * This is the app's one gradient: keep it to rank and reward moments, never chrome or cards.
 * Render it first inside a `relative` container; it fills the parent and ignores touches.
 */
export function RankGlow({ tier, intensity = 0.18 }: RankGlowProps) {
  const id = `glow-${tier}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="35%" cy="45%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={rankColors[tier].highlight} stopOpacity={intensity} />
            <Stop offset="1" stopColor={rankColors[tier].highlight} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

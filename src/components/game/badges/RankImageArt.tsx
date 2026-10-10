import { Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { RankDivision } from '@/lib/game';
import { rankColors, type RankTier } from '@/theme';

interface RankImageArtProps {
  source: ImageSourcePropType;
  tier: RankTier;
  size: number;
  division?: RankDivision;
}

/** Pips are live vector UI, separate from the image: III = one, II = two, I = three. */
export function RankImageArt({ source, tier, size, division }: RankImageArtProps) {
  const color = rankColors[tier];
  const earned = division && tier !== 'champion' ? 4 - division : 0;
  return (
    <View style={{ width: size, height: size * 1.12 }}>
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
        resizeMethod="resize"
      />
      {earned > 0 ? (
        <Svg width={size} height={size * 0.12} viewBox="0 0 100 12" testID="division-pips">
          {[0, 1, 2].map((pip) => (
            <Circle
              key={pip}
              cx={38 + pip * 12}
              cy={6}
              r={3.5}
              fill={pip < earned ? color.highlight : color.on}
              stroke={color.base}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

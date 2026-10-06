import { View } from 'react-native';

import { HexEmblem } from '@/components';
import { rankColors, useTheme, type RankTier } from '@/theme';

const ORBIT: { tier: RankTier; size: number; top: number; left: string }[] = [
  { tier: 'master', size: 34, top: 18, left: '8%' },
  { tier: 'diamond', size: 34, top: 18, left: '80%' },
  { tier: 'bronze', size: 44, top: 108, left: '4%' },
  { tier: 'gold', size: 44, top: 108, left: '82%' },
  { tier: 'silver', size: 38, top: 160, left: '22%' },
  { tier: 'platinum', size: 38, top: 160, left: '66%' },
];

/** Welcome art: the app emblem in the signal colour, orbited by tier emblems. */
export function EmblemCluster() {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="h-60 items-center justify-center"
    >
      {ORBIT.map((o) => (
        <View
          key={o.tier}
          className="absolute"
          style={{ top: o.top, left: o.left as `${number}%` }}
        >
          <HexEmblem
            color={rankColors[o.tier].base}
            size={o.size}
            chevrons={0}
            fillOpacity={0.12}
          />
        </View>
      ))}
      <HexEmblem color={colors.primary} size={128} chevrons={2} fillOpacity={0.1} />
    </View>
  );
}

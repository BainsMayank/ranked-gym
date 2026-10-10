import { ScrollView, View } from 'react-native';

import { RankBadge, Text } from '@/components';
import { compareRanks, tierName, type Rank } from '@/lib/game';
import { rankColors, rankTiers } from '@/theme';

/** Every tier in order; reached tiers in colour, the current one labelled, later ones dimmed. */
export function TierStrip({ rank }: { rank: Rank | null }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-lg"
      contentContainerClassName="gap-md px-lg"
    >
      {rankTiers.map((tier) => {
        const reached = rank ? compareRanks({ tier, division: 3 }, rank) <= 0 : false;
        const current = tier === rank?.tier;
        return (
          <View key={tier} className="items-center gap-xxs" style={{ opacity: reached ? 1 : 0.35 }}>
            <RankBadge tier={tier} size={32} />
            <Text
              variant="caption"
              style={current ? { color: rankColors[tier].base } : null}
              tone="muted"
            >
              {tierName(tier)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

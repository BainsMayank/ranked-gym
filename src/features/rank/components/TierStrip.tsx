import { ScrollView, View } from 'react-native';

import { RankBadge, Text } from '@/components';
import { compareRanks, tierName } from '@/lib/game';
import { rankColors, rankTiers } from '@/theme';

import { overall } from '../mocks';

/** Every tier in order; reached tiers in colour, the current one labelled, later ones dimmed. */
export function TierStrip() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-lg"
      contentContainerClassName="gap-md px-lg"
    >
      {rankTiers.map((tier) => {
        const reached = compareRanks({ tier, division: 3 }, overall.rank) <= 0;
        const current = tier === overall.rank.tier;
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

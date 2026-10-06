import { View } from 'react-native';

import { ListGroup, ProgressBar, RankBadge, RankTag, Text } from '@/components';
import { rankLabel } from '@/lib/game';

import { lifts } from '../mocks';

/** Rank per tracked lift with progress to the next division. */
export function LiftRanksList() {
  return (
    <ListGroup>
      {lifts.map((l) => (
        <View
          key={l.name}
          accessible
          accessibilityLabel={`${l.name}: ${rankLabel(l.rank.tier, l.rank.division)}. ${l.meta}`}
          className="flex-row items-center gap-md px-lg py-md"
        >
          <RankBadge tier={l.rank.tier} division={l.rank.division} size={32} />
          <View className="flex-1 gap-xs">
            <View className="flex-row items-center justify-between gap-sm">
              <Text variant="subheading">{l.name}</Text>
              <RankTag tier={l.rank.tier} division={l.rank.division} />
            </View>
            <ProgressBar
              progress={l.progress}
              rankTier={l.rank.tier}
              height={4}
              accessibilityLabel={`${l.name} progress`}
            />
            <Text variant="caption" tone="muted" numeric>
              {l.meta}
            </Text>
          </View>
        </View>
      ))}
    </ListGroup>
  );
}

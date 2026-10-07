import { View } from 'react-native';

import { DivisionLadder, RankBadge, RankGlow, Text } from '@/components';
import { rankLabel } from '@/lib/game';
import { rankColors } from '@/theme';

import { overall } from '../mocks';

/** The overall rank: emblem, tier, power score and the division ladder. The screen's one hero. */
export function RankHeroCard() {
  const { tier, division } = overall.rank;
  return (
    <View className="relative items-center gap-sm overflow-hidden rounded-lg border-t border-edge bg-surface px-lg py-xl">
      <RankGlow tier={tier} intensity={0.22} />
      <RankBadge tier={tier} division={division} size={96} />
      <Text variant="overline" tone="muted" className="mt-sm">
        Overall rank
      </Text>
      <Text variant="hero" style={{ color: rankColors[tier].base }}>
        {rankLabel(tier, division)}
      </Text>
      <Text tone="muted">
        Strength score{' '}
        <Text numeric className="text-text">
          {overall.strengthScore.toLocaleString('en-IN')}
        </Text>{' '}
        · {overall.standing}
      </Text>
      {division ? (
        <DivisionLadder
          tier={tier}
          division={division}
          progress={overall.progress}
          className="mt-md self-stretch"
        />
      ) : null}
      <Text variant="label" numeric className="self-start">
        {overall.pointsToNext} SS to {overall.nextLabel}
      </Text>
    </View>
  );
}

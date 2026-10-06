import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Avatar, DivisionLadder, RankBadge, RankGlow, Text } from '@/components';
import { DIVISIONS } from '@/lib/game';
import { rarities, rankTiers } from '@/theme';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-md">
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );
}

/** Gallery of the game layer: rank art slots, ladder, glow, avatar rings and levels. */
export function GameSection() {
  return (
    <>
      <Block title="Rank hero">
        <View className="relative -mx-lg overflow-hidden px-lg py-lg">
          <RankGlow tier="gold" />
          <Text variant="overline" tone="muted">
            Overall
          </Text>
          <Text variant="hero">Gold II</Text>
          <DivisionLadder tier="gold" division={2} progress={0.62} className="mt-md" />
          <Text tone="muted" className="mt-sm">
            <Text numeric className="text-text">
              240
            </Text>{' '}
            points to Gold I
          </Text>
        </View>
        <DivisionLadder tier="diamond" division={4} progress={0.3} tierColored />
      </Block>

      <Block title="RankBadge">
        <View className="flex-row flex-wrap gap-lg">
          {rankTiers.map((tier, i) => (
            <RankBadge
              key={tier}
              tier={tier}
              division={DIVISIONS[i % DIVISIONS.length]}
              showLabel
              size={56}
            />
          ))}
        </View>
      </Block>

      <Block title="Avatar">
        <View className="flex-row items-end gap-md">
          <Avatar name="Aarav Sharma" size="sm" />
          <Avatar name="Diya Patel" size="md" ring={{ tier: 'platinum' }} />
          <Avatar name="Kabir" size="lg" ring={{ tier: 'gold' }} level={12} />
          <Avatar
            name="Broken Image"
            uri="https://invalid.example/x.png"
            size="xl"
            ring={{ rarity: 'legendary' }}
            level={48}
          />
        </View>
        <View className="flex-row gap-md">
          {rarities.map((r) => (
            <View key={r} className="items-center gap-xs">
              <Avatar name={r} size="md" ring={{ rarity: r }} />
              <Text variant="caption" tone="muted">
                {r}
              </Text>
            </View>
          ))}
        </View>
      </Block>
    </>
  );
}

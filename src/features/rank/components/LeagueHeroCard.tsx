import { View } from 'react-native';

import { Icon, RankGlow, Stat, Text } from '@/components';
import { rankColors } from '@/theme';

import { league } from '../mocks';

export function LeagueHeroCard() {
  const color = rankColors[league.tier].base;
  return (
    <View className="relative gap-lg overflow-hidden rounded-lg border-t border-edge bg-surface p-lg">
      <RankGlow tier={league.tier} />
      <View className="flex-row items-center gap-md">
        <Icon name="trophy-outline" size={32} color={color} />
        <View className="flex-1">
          <Text variant="title" style={{ color }}>
            {league.name}
          </Text>
          <Text variant="caption" tone="muted">
            {league.meta}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-sm">
        <Stat label="Position" value={`#${league.position}`} boxed center className="flex-1" />
        <Stat label="League XP" value={league.xp} boxed center className="flex-1" />
        <Stat
          label="Promote"
          value={`Top ${league.promoteTop}`}
          valueTone="success"
          boxed
          center
          className="flex-1"
        />
      </View>
    </View>
  );
}

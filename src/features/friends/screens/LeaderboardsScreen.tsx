import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Avatar,
  Chip,
  LeaderboardRow,
  RankTag,
  Screen,
  SegmentedControl,
  SelectField,
  Text,
} from '@/components';

import { Podium } from '../components/Podium';
import { board, metrics, scopes, you } from '../mocks';

/** Friends → Leaderboards: scope, region and metric filters, podium, standings and your pinned row. */
export function LeaderboardsScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<(typeof scopes)[number]['value']>('regional');
  const [metric, setMetric] = useState<(typeof metrics)[number]>('Power score');

  return (
    <Screen
      title="Leaderboards"
      onBack={() => router.back()}
      scroll
      footer={
        <View
          accessible
          accessibilityLabel={`You are ${you.position}, ${you.score}`}
          className="flex-row items-center gap-md rounded-lg border-l-2 border-primary bg-surface px-lg py-sm"
        >
          <Text variant="subheading" tone="primary" numeric>
            {you.position}
          </Text>
          <Avatar name={you.name} size="sm" />
          <View className="flex-1">
            <Text variant="subheading">You</Text>
            <RankTag tier={you.rank.tier} division={you.rank.division} />
          </View>
          <Text variant="subheading" numeric>
            {you.score}
          </Text>
        </View>
      }
    >
      <View className="gap-lg">
        <SegmentedControl
          accessibilityLabel="Leaderboard scope"
          options={scopes}
          value={scope}
          onChange={setScope}
        />
        <View className="flex-row gap-sm">
          <SelectField value="Delhi · All colleges" onPress={() => undefined} />
          <SelectField value="This season" onPress={() => undefined} className="max-w-36" />
        </View>
        <View className="flex-row flex-wrap gap-sm">
          {metrics.map((m) => (
            <Chip key={m} label={m} selected={m === metric} onPress={() => setMetric(m)} />
          ))}
        </View>
        <Podium top={board.slice(0, 3)} />
        <View className="overflow-hidden rounded-lg border-t border-edge bg-surface py-xs">
          {board.slice(3).map((e) => (
            <LeaderboardRow
              key={e.position}
              position={e.position}
              name={e.name}
              rank={e.rank}
              score={e.score}
              movement={e.movement}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

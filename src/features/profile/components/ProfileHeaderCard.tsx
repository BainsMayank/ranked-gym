import { View } from 'react-native';

import { Avatar, Button, RankTag, Text } from '@/components';

import { me } from '../mocks';

export function ProfileHeaderCard() {
  return (
    <View className="gap-sm rounded-lg border-t border-edge bg-surface p-lg">
      <View className="flex-row items-start justify-between">
        <Avatar name={me.name} size="xl" ring={{ tier: me.rank.tier }} level={me.level} />
        <Button label="Edit profile" variant="outline" size="sm" onPress={() => undefined} />
      </View>
      <View className="mt-sm gap-xxs">
        <View className="flex-row items-center gap-sm">
          <Text variant="title">{me.name}</Text>
          <RankTag tier={me.rank.tier} division={me.rank.division} />
        </View>
        <Text variant="caption" tone="muted">
          {me.handle} · {me.college}
        </Text>
        <Text variant="label" tone="primary">
          “{me.title}”
        </Text>
      </View>
      <Text tone="muted">{me.bio}</Text>
    </View>
  );
}

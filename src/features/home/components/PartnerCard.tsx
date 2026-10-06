import { View } from 'react-native';

import { Avatar, Button, RankTag, Text } from '@/components';
import type { Rank } from '@/lib/game';

interface PartnerCardProps {
  name: string;
  meta: string;
  rank: Rank;
}

export function PartnerCard({ name, meta, rank }: PartnerCardProps) {
  return (
    <View className="w-44 items-center gap-sm rounded-lg border-t border-edge bg-surface p-lg">
      <Avatar name={name} size="lg" ring={{ tier: rank.tier }} />
      <View className="items-center gap-xxs">
        <Text variant="subheading">{name}</Text>
        <Text variant="caption" tone="muted" className="text-center" numberOfLines={2}>
          {meta}
        </Text>
        <RankTag tier={rank.tier} division={rank.division} />
      </View>
      <Button label="Connect" variant="secondary" size="sm" fullWidth onPress={() => undefined} />
    </View>
  );
}

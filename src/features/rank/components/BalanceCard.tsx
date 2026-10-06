import { View } from 'react-native';

import { Card, Tag, Text } from '@/components';

import { balance } from '../mocks';

export function BalanceCard() {
  return (
    <Card className="gap-md">
      <Text variant="subheading">Strength balance</Text>
      {balance.map((b) => (
        <View key={b.name} className="flex-row items-center gap-md">
          <View className="flex-1">
            <Text variant="label">{b.name}</Text>
            <Text variant="caption" tone="muted">
              {b.range}
            </Text>
          </View>
          <Text variant="subheading" numeric>
            {b.value}
          </Text>
          <Tag label={b.status} tone={b.ok ? 'success' : 'warning'} />
        </View>
      ))}
    </Card>
  );
}

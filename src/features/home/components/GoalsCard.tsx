import { View } from 'react-native';

import { Button, Card, ProgressBar, Text } from '@/components';

import { goals } from '../mocks';

export function GoalsCard() {
  return (
    <Card className="gap-md">
      <View className="flex-row items-center justify-between">
        <Text variant="subheading">Goals</Text>
        <Button label="Add goal" icon="add" variant="ghost" size="sm" onPress={() => undefined} />
      </View>
      {goals.map((g) => (
        <View key={g.title} className="gap-xs">
          <View className="flex-row items-center justify-between gap-md">
            <Text variant="label" className="flex-1" numberOfLines={1}>
              {g.title}
            </Text>
            <Text variant="caption" tone="muted" numeric>
              {g.value}
            </Text>
          </View>
          <ProgressBar progress={g.progress} accessibilityLabel={g.title} />
        </View>
      ))}
    </Card>
  );
}

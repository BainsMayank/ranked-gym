import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Text } from '@/components';

import { today } from '../mocks';

/** Today's planned session with the screen's one main action. */
export function TodayWorkoutCard() {
  const router = useRouter();
  return (
    <Card className="gap-md">
      <View className="flex-row items-center justify-between gap-md">
        <Text variant="overline" tone="primary" className="flex-1" numberOfLines={1}>
          {today.planLabel}
        </Text>
        <Text variant="label" tone="muted" numeric>
          ~{today.durationMin} min
        </Text>
      </View>
      <View className="gap-xs">
        <Text variant="display">{today.title}</Text>
        <Text tone="muted">{today.exercises.join(' · ')}</Text>
      </View>
      <View className="flex-row gap-sm">
        <Button
          label="Start workout"
          icon="play"
          className="flex-1"
          onPress={() => router.push({ pathname: '/session', params: { routine: 'push-a' } })}
        />
        <Button label="Swap" variant="secondary" onPress={() => undefined} />
      </View>
    </Card>
  );
}

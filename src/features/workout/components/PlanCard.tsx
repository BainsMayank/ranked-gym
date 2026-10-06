import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Tag, Text } from '@/components';

import { plan } from '../mocks';
import { WeekStrip } from './WeekStrip';

export function PlanCard() {
  const router = useRouter();
  return (
    <Card className="gap-md">
      <View className="flex-row items-start justify-between gap-md">
        <View className="flex-1 gap-xxs">
          <Text variant="overline" tone="muted">
            Your plan
          </Text>
          <Text variant="heading">{plan.title}</Text>
        </View>
        <Tag label={plan.week} tone="primary" />
      </View>
      <WeekStrip />
      <View className="flex-row gap-sm">
        <Button
          label="New plan"
          variant="secondary"
          className="flex-1"
          onPress={() => router.push('/plan/new')}
        />
        <Button
          label="Edit plan"
          variant="secondary"
          className="flex-1"
          onPress={() => router.push('/plan/new')}
        />
      </View>
    </Card>
  );
}

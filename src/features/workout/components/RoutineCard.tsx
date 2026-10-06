import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, IconButton, Text } from '@/components';

import type { Routine } from '../mocks';

/** A saved routine: tap to edit, play to start a session from it. */
export function RoutineCard({ routine }: { routine: Routine }) {
  const router = useRouter();
  return (
    <Card
      onPress={() => router.push({ pathname: '/routine/[id]', params: { id: routine.id } })}
      accessibilityLabel={`Edit ${routine.name}`}
      className="flex-row items-center gap-md"
    >
      <View className="flex-1 gap-xxs">
        <Text variant="subheading">{routine.name}</Text>
        <Text variant="label" tone="muted" numberOfLines={1}>
          {routine.summary}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {routine.meta}
        </Text>
      </View>
      <IconButton
        icon="play"
        variant="primary"
        accessibilityLabel={`Start ${routine.name}`}
        onPress={() => router.push({ pathname: '/session', params: { routine: routine.id } })}
      />
    </Card>
  );
}

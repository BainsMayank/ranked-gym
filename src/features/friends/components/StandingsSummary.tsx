import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, SectionHeader, Stat } from '@/components';

import { standings } from '../mocks';

export function StandingsSummary() {
  const router = useRouter();
  return (
    <Card className="gap-md">
      <SectionHeader
        title="Leaderboards"
        action={{ label: 'View all', onPress: () => router.push('/friends/leaderboards') }}
      />
      <View className="flex-row gap-sm">
        {standings.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} boxed center className="flex-1" />
        ))}
      </View>
    </Card>
  );
}

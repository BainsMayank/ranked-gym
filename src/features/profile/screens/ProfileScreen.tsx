import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Card, EmptyState, RankBadge, Screen, Text } from '@/components';

import { ListRow } from '../components/ListRow';

export function ProfileScreen() {
  const router = useRouter();

  return (
    <Screen title="Profile" scroll>
      <View className="gap-lg">
        <Card className="flex-row items-center gap-lg">
          <Avatar name="Guest Lifter" size="lg" />
          <View className="flex-1 gap-xs">
            <Text variant="heading">Guest Lifter</Text>
            <Text tone="muted">Sign in to save your progress</Text>
          </View>
          <RankBadge tier="iron" division={4} size={44} />
        </Card>

        <Card padded={false}>
          <EmptyState
            icon="ribbon-outline"
            title="XP, levels, streaks and badges"
            description="Your level, current streak and badge collection will live here. Coming in Phase 11."
            className="py-xl"
          />
        </Card>

        <View className="gap-sm">
          <ListRow
            title="Settings"
            icon="settings-outline"
            onPress={() => router.push('/profile/settings')}
          />
          {__DEV__ ? (
            <ListRow
              title="Component gallery"
              subtitle="Dev builds only"
              icon="construct-outline"
              onPress={() => router.push('/dev/components')}
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

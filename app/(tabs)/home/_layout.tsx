import { View } from 'react-native';

import { IconButton, StreakChip } from '@/components';
import { TopTabsNavigator } from '@/components/navigation/TopTabsNavigator';

const SCREENS = [
  { name: 'index', title: 'For You' },
  { name: 'feed', title: 'Feed' },
  { name: 'discover', title: 'Discover' },
] as const;

export default function HomeLayout() {
  return (
    <TopTabsNavigator
      title="Home"
      screens={SCREENS}
      headerRight={
        <View className="flex-row items-center gap-sm">
          <StreakChip days={12} />
          <IconButton
            icon="notifications-outline"
            accessibilityLabel="Notifications"
            variant="surface"
          />
        </View>
      }
    />
  );
}

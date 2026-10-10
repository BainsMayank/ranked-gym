import { router } from 'expo-router';
import { View } from 'react-native';

import { IconButton, Text } from '@/components';
import { useNotificationsRealtime, useUnreadCount } from '@/lib/social';

/** The Home header bell, with the unread count as a small orange badge. */
export function NotificationBell() {
  useNotificationsRealtime();
  const unread = useUnreadCount().data ?? 0;
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';
  return (
    <View>
      <IconButton
        icon={unread > 0 ? 'notifications' : 'notifications-outline'}
        accessibilityLabel={label}
        variant="surface"
        onPress={() => router.push('/notifications')}
      />
      {unread > 0 ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          className="absolute -right-xxs -top-xxs min-w-5 items-center rounded-xl bg-primary px-xs"
        >
          <Text variant="caption" tone="onPrimary" numeric>
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

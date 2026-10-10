import { View } from 'react-native';

import { EmptyState, Icon, Text } from '@/components';

/** The dev preview browses signed out; social reads need an account. */
export function SignedOutSocial({ what }: { what: string }) {
  return (
    <EmptyState
      icon="person-circle-outline"
      title={`Sign in to see ${what}`}
      description="Posts, friends and Discover live on the server, so they need an account."
    />
  );
}

/** Shown above cached posts when the phone is offline. */
export function OfflineNotice() {
  return (
    <View
      accessible
      accessibilityRole="alert"
      className="mx-lg flex-row items-center gap-sm rounded-md bg-surface px-md py-sm"
    >
      <Icon name="cloud-offline-outline" size={16} tone="textMuted" />
      <Text variant="caption" tone="muted" className="flex-1">
        You’re offline. Showing what was loaded last; new posts and replies need a connection.
      </Text>
    </View>
  );
}

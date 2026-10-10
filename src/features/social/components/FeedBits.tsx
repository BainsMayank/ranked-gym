import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Icon, PressableScale, Skeleton, Text } from '@/components';

/** The first row of the Feed: tap to write a post. */
export function ComposerPrompt({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <PressableScale
      onPress={() => router.push('/post/new')}
      accessibilityRole="button"
      accessibilityLabel="Write a post"
      className="mx-lg my-md flex-row items-center gap-md rounded-lg border-t border-edge bg-surface px-md py-sm"
    >
      <Avatar name={name} uri={avatarUrl} size="sm" />
      <Text tone="muted" className="flex-1" numberOfLines={1}>
        Share a workout, photo or PR
      </Text>
      <Icon name="image-outline" size={20} tone="textMuted" />
    </PressableScale>
  );
}

/** Floats over the top of the Feed when friends post while you're reading. */
export function NewPostsPill({ onPress }: { onPress: () => void }) {
  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 top-sm items-center">
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Show new posts"
        className="min-h-11 flex-row items-center gap-xs rounded-xl bg-text px-lg"
      >
        <Icon name="arrow-up" size={16} tone="background" />
        <Text variant="label" tone="inverse">
          New posts
        </Text>
      </PressableScale>
    </View>
  );
}

/** Marks where the posts you've already seen begin. */
export function CaughtUpDivider() {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel="You're all caught up. Older posts below."
      className="flex-row items-center gap-md px-lg py-lg"
    >
      <View className="h-px flex-1 bg-border" />
      <Icon name="checkmark-circle-outline" size={16} tone="success" />
      <Text variant="label" tone="muted">
        You’re all caught up
      </Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}

/** Placeholder rows shaped like posts. */
export function PostSkeletons({ count = 3 }: { count?: number }) {
  return (
    <View accessibilityLabel="Loading posts" accessible>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="gap-md border-b border-border px-lg py-lg">
          <View className="flex-row items-center gap-md">
            <Skeleton width={44} height={44} radius="xl" />
            <View className="flex-1 gap-xs">
              <Skeleton width="40%" height={14} />
              <Skeleton width="25%" height={12} />
            </View>
          </View>
          <Skeleton width="70%" height={20} />
          <Skeleton height={96} radius="md" />
        </View>
      ))}
    </View>
  );
}

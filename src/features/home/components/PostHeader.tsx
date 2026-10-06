import { View } from 'react-native';

import { Avatar, IconButton, Text } from '@/components';

export function PostHeader({ author, meta }: { author: string; meta: string }) {
  return (
    <View className="flex-row items-center gap-md">
      <Avatar name={author} size="md" />
      <View className="flex-1">
        <Text variant="subheading">{author}</Text>
        <Text variant="caption" tone="muted">
          {meta}
        </Text>
      </View>
      <IconButton icon="ellipsis-horizontal" accessibilityLabel="Post options" size="sm" />
    </View>
  );
}

import { View } from 'react-native';

import { Button, IconButton } from '@/components';

interface PostActionsProps {
  likes: number;
  comments: number;
  /** Shown for workout posts: copies the routine into your own. */
  canCopy?: boolean;
}

export function PostActions({ likes, comments, canCopy = false }: PostActionsProps) {
  return (
    <View className="flex-row items-center gap-sm">
      <Button
        label={`${likes}`}
        icon="heart-outline"
        variant="secondary"
        size="sm"
        accessibilityLabel={`Like, ${likes} likes`}
        onPress={() => undefined}
      />
      <Button
        label={`${comments}`}
        icon="chatbubble-outline"
        variant="secondary"
        size="sm"
        accessibilityLabel={`Comment, ${comments} comments`}
        onPress={() => undefined}
      />
      <View className="flex-1" />
      {canCopy ? (
        <Button
          label="Copy workout"
          icon="copy-outline"
          variant="ghost"
          size="sm"
          onPress={() => undefined}
        />
      ) : null}
      <IconButton icon="share-outline" accessibilityLabel="Share" size="sm" variant="surface" />
    </View>
  );
}

import { View } from 'react-native';

import { Button, Icon, PressableScale, Text, showToast } from '@/components';
import { haptics } from '@/lib/haptics';
import { socialErrorMessage, useRespect, type Post } from '@/lib/social';

import { commentCount, respectCount } from '../format';

interface PostActionsProps {
  post: Post;
  onComment: () => void;
  /** Workout posts by someone else: copy it into my routines. */
  onCopy?: () => void;
}

/** Respect (a toggle), comments and, for workouts, Copy workout. */
export function PostActions({ post, onComment, onCopy }: PostActionsProps) {
  const respect = useRespect();
  const give = () => {
    haptics.selection();
    respect.mutate(
      { postId: post.id, give: !post.respected },
      { onError: (e) => showToast({ message: socialErrorMessage(e) }) },
    );
  };
  return (
    <View className="flex-row items-center gap-xs">
      <PressableScale
        onPress={give}
        accessibilityRole="button"
        accessibilityLabel={post.respected ? 'Take back respect' : 'Give respect'}
        accessibilityState={{ selected: post.respected }}
        accessibilityValue={{ text: respectCount(post.respects) }}
        className="min-h-11 flex-row items-center gap-xs rounded-md px-sm"
      >
        <Icon
          name={post.respected ? 'thumbs-up' : 'thumbs-up-outline'}
          size={20}
          tone={post.respected ? 'primary' : 'textMuted'}
        />
        <Text variant="label" tone={post.respected ? 'primary' : 'muted'} numeric>
          {post.respects > 0 ? post.respects : 'Respect'}
        </Text>
      </PressableScale>
      <PressableScale
        onPress={onComment}
        accessibilityRole="button"
        accessibilityLabel={`Comments, ${commentCount(post.comments)}`}
        className="min-h-11 flex-row items-center gap-xs rounded-md px-sm"
      >
        <Icon name="chatbubble-outline" size={19} tone="textMuted" />
        <Text variant="label" tone="muted" numeric>
          {post.comments > 0 ? post.comments : 'Comment'}
        </Text>
      </PressableScale>
      <View className="flex-1" />
      {onCopy ? (
        <Button
          label="Copy workout"
          icon="copy-outline"
          variant="ghost"
          size="sm"
          onPress={onCopy}
        />
      ) : null}
    </View>
  );
}

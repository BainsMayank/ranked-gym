import { Alert, View } from 'react-native';

import { showToast, Text } from '@/components';
import { socialErrorMessage, useDeleteComment, type Comment } from '@/lib/social';

import { displayName } from '../format';
import { CommentRow } from './CommentRow';

interface CommentThreadProps {
  postId: string;
  comments: readonly Comment[];
  onReply: (comment: Comment) => void;
  onReport: (commentId: string) => void;
}

/** Top-level comments in order, each followed by its replies (one level). */
export function CommentThread({ postId, comments, onReply, onReport }: CommentThreadProps) {
  const remove = useDeleteComment(postId);
  const top = comments.filter((c) => !c.parentId);
  const replies = (id: string) => comments.filter((c) => c.parentId === id);
  const confirmDelete = (c: Comment) =>
    Alert.alert('Delete this comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(c.id, { onError: (e) => showToast({ message: socialErrorMessage(e) }) }),
      },
    ]);
  const row = (c: Comment, isReply: boolean) => (
    <CommentRow
      key={c.id}
      comment={c}
      isReply={isReply}
      onReply={isReply ? undefined : () => onReply(c)}
      onDelete={c.canDelete ? () => confirmDelete(c) : undefined}
      onReport={c.mine ? undefined : () => onReport(c.id)}
    />
  );

  if (top.length === 0) {
    return (
      <Text tone="muted" className="py-lg">
        No comments yet. Say something encouraging.
      </Text>
    );
  }
  return (
    <View accessibilityLabel={`${comments.length} comments`}>
      {top.map((c) => (
        <View key={c.id}>
          {row(c, false)}
          {replies(c.id).map((r) => row(r, true))}
        </View>
      ))}
    </View>
  );
}

export const replyLabel = (c: Comment) =>
  c.author.username ? `@${c.author.username}` : displayName(c.author);

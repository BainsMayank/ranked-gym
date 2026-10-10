import { View } from 'react-native';

import { Avatar, PressableScale, Text } from '@/components';
import type { Comment } from '@/lib/social';

import { displayName, timeAgo } from '../format';
import { MentionText } from './MentionText';

interface CommentRowProps {
  comment: Comment;
  isReply: boolean;
  onReply?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

/** A quiet text action under a comment (muted, so a long thread doesn't fill with orange). */
function Action({ label, onPress, a11y }: { label: string; onPress: () => void; a11y?: string }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      hitSlop={{ top: 6, bottom: 6 }}
      className="min-h-8 justify-center px-sm"
    >
      <Text variant="label" tone="muted">
        {label}
      </Text>
    </PressableScale>
  );
}

/** One comment: who, when, what, and Reply / Delete / Report. Replies are indented once. */
export function CommentRow({ comment, isReply, onReply, onDelete, onReport }: CommentRowProps) {
  const name = displayName(comment.author);
  if (comment.deleted) {
    return (
      <View className={isReply ? 'py-sm pl-xxl' : 'py-sm'}>
        <Text variant="caption" tone="muted">
          Comment deleted
        </Text>
      </View>
    );
  }
  return (
    <View className={isReply ? 'flex-row gap-sm py-sm pl-xxl' : 'flex-row gap-sm py-sm'}>
      <Avatar
        name={name}
        uri={comment.author.avatarUrl}
        size="sm"
        ring={comment.author.rank ? { tier: comment.author.rank.tier } : undefined}
      />
      <View className="flex-1 gap-xxs">
        <Text variant="caption" tone="muted" numberOfLines={1}>
          <Text variant="label">{name}</Text>
          {`  ${comment.pending ? 'sending…' : timeAgo(comment.createdAt)}${comment.editedAt ? ' · edited' : ''}`}
        </Text>
        <MentionText variant="body">{comment.body ?? ''}</MentionText>
        {comment.pending ? null : (
          <View className="-ml-sm flex-row">
            {onReply ? <Action label="Reply" onPress={onReply} a11y={`Reply to ${name}`} /> : null}
            {onDelete ? (
              <Action label="Delete" onPress={onDelete} a11y={`Delete comment by ${name}`} />
            ) : null}
            {onReport ? (
              <Action label="Report" onPress={onReport} a11y={`Report comment by ${name}`} />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

import { forwardRef } from 'react';
import { TextInput, View } from 'react-native';

import { IconButton, Text } from '@/components';
import { useTheme } from '@/theme';

import type { useMentionInput } from '../useMentionInput';
import { MentionSuggestions } from './MentionSuggestions';

interface CommentComposerProps {
  input: ReturnType<typeof useMentionInput>;
  replyingTo: string | null;
  onCancelReply: () => void;
  onSend: () => void;
  disabled?: boolean;
}

/** Pinned under the comments: mentions, a "Replying to" line and Send. */
export const CommentComposer = forwardRef<TextInput, CommentComposerProps>(function CommentComposer(
  { input, replyingTo, onCancelReply, onSend, disabled },
  ref,
) {
  const { colors } = useTheme();
  const canSend = input.text.trim().length > 0 && !disabled;
  return (
    <View className="gap-sm">
      {input.mentionQuery !== null ? (
        <MentionSuggestions
          query={input.mentionQuery}
          onPick={(p) => p.username && input.pick(p.username)}
        />
      ) : null}
      {replyingTo ? (
        <View className="flex-row items-center justify-between">
          <Text variant="caption" tone="muted">
            Replying to {replyingTo}
          </Text>
          <IconButton
            icon="close"
            size="sm"
            accessibilityLabel="Cancel reply"
            onPress={onCancelReply}
          />
        </View>
      ) : null}
      <View className="flex-row items-end gap-sm">
        <TextInput
          ref={ref}
          value={input.text}
          onChangeText={input.setText}
          selection={input.selection}
          onSelectionChange={input.onSelectionChange}
          placeholder="Add a comment"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          multiline
          maxLength={500}
          autoComplete="off"
          textContentType="none"
          accessibilityLabel="Comment"
          className="max-h-28 min-h-11 flex-1 rounded-md bg-surface px-md py-sm text-body text-text"
        />
        <IconButton
          icon="arrow-up"
          variant={canSend ? 'primary' : 'surface'}
          accessibilityLabel="Send comment"
          disabled={!canSend}
          accessibilityState={{ disabled: !canSend }}
          onPress={onSend}
        />
      </View>
    </View>
  );
});

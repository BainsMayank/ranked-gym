import { useState } from 'react';
import type { NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';

import { activeMention, insertMention } from '@/lib/social';

/** Text plus caret tracking for @mention autocomplete in a TextInput. */
export function useMentionInput(initial = '') {
  const [text, setText] = useState(initial);
  const [caret, setCaret] = useState(initial.length);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();
  const mention = activeMention(text, caret);
  return {
    text,
    setText: (t: string) => {
      setText(t);
      setSelection(undefined);
    },
    selection,
    onSelectionChange: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) =>
      setCaret(e.nativeEvent.selection.end),
    mentionQuery: mention?.query ?? null,
    pick: (username: string) => {
      if (!mention) return;
      const next = insertMention(text, mention, username, caret);
      setText(next.text);
      setCaret(next.caret);
      setSelection({ start: next.caret, end: next.caret });
    },
    reset: () => {
      setText('');
      setCaret(0);
      setSelection(undefined);
    },
  };
}

import { useState } from 'react';
import { TextInput, type KeyboardTypeOptions } from 'react-native';

import { cn } from '@/lib/utils';
import { fontFamilies, useTheme } from '@/theme';

interface SetCellProps {
  value: string;
  accessibilityLabel: string;
  /** Called on blur with the typed text; return false to reject it (the cell reverts). */
  onCommit?: (text: string) => boolean;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  className?: string;
}

/**
 * One editable value in a set row (kg, reps, time, RIR/RPE). Typing stays local; the value is
 * committed on blur, so one edit is one undo step and the rest of the list doesn't re-render.
 */
export function SetCell({
  value,
  accessibilityLabel,
  onCommit,
  placeholder = '–',
  keyboardType = 'decimal-pad',
  className,
}: SetCellProps) {
  const { colors } = useTheme();
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  // Follow outside changes (undo, warm-ups) when not mid-edit.
  if (value !== shown) {
    setShown(value);
    setText(value);
  }

  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={(e) => {
        // The event carries the final text; state may lag when typing and blur land together.
        const typed = e.nativeEvent.text ?? text;
        if (typed === value) return;
        if (onCommit && !onCommit(typed)) setText(value);
      }}
      accessibilityLabel={accessibilityLabel}
      keyboardType={keyboardType}
      selectTextOnFocus
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.primary}
      returnKeyType="done"
      className={cn('h-11 rounded-sm bg-surface-raised px-sm text-center text-text', className)}
      // No lineHeight: iOS offsets single-line TextInput text when one is set.
      style={{
        fontFamily: fontFamilies.medium,
        fontSize: 15,
        paddingVertical: 0,
        fontVariant: ['tabular-nums'],
      }}
    />
  );
}

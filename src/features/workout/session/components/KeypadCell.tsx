import { memo } from 'react';
import { Pressable } from 'react-native';

import { Text } from '@/components';
import { cn } from '@/lib/utils';

import { useKeypadDraft } from '../draft';

interface KeypadCellProps {
  /** The logged value as text ('' when empty). */
  value: string;
  /** Shown in grey when empty: the target or last time. Ticking adopts it. */
  suggestion: string;
  active: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  className?: string;
}

/** A set value that opens the session keypad (no system keyboard). Large, thumb-sized. */
export const KeypadCell = memo(function KeypadCell({
  value,
  suggestion,
  active,
  accessibilityLabel,
  onPress,
  className,
}: KeypadCellProps) {
  // Only the active cell follows the typed draft.
  const draft = useKeypadDraft((s) => (active ? s.draft : null));
  const shown = draft ?? value;
  const empty = shown === '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: shown || (suggestion ? `suggested ${suggestion}` : 'empty') }}
      accessibilityState={{ selected: active }}
      accessibilityHint="Opens the keypad"
      onPress={onPress}
      className={cn(
        'h-12 items-center justify-center rounded-sm bg-surface-raised px-xs',
        active && 'border-2 border-primary',
        className,
      )}
    >
      <Text
        variant="subheading"
        tone={empty ? 'muted' : 'default'}
        numeric
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.4}
      >
        {empty ? suggestion || '–' : shown}
      </Text>
    </Pressable>
  );
});

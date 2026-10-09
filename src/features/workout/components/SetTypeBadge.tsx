import { Pressable } from 'react-native';

import { Text, type TextTone } from '@/components';
import { setTypeInfo, type SetType } from '@/lib/routines';

/** Colour marks exceptions only: warm-ups, the top set and failure sets. */
const tones: Record<SetType, TextTone> = {
  warmup: 'warning',
  working: 'default',
  top: 'primary',
  backoff: 'default',
  drop: 'muted',
  failure: 'danger',
  amrap: 'default',
};

interface SetTypeBadgeProps {
  type: SetType;
  /** From setMarks(): '1', '2' for working sets, otherwise the type's letter. */
  mark: string;
  /** Opens the set's options (type, load, tempo). */
  onPress?: () => void;
  /** Position for screen readers, e.g. "Set 3". */
  position?: string;
}

/** Square set marker (W, 1, 2, T, B, D, F, A). Tap to change the set type. */
export function SetTypeBadge({ type, mark, onPress, position }: SetTypeBadgeProps) {
  const name = setTypeInfo[type].name;
  const label = [position, type === 'working' ? `${name} ${mark}` : name]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityHint={onPress ? 'Change set type and options' : undefined}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      className="h-11 w-10 items-center justify-center rounded-sm bg-surface-raised active:opacity-70"
    >
      <Text variant="label" tone={tones[type]} numeric>
        {mark}
      </Text>
    </Pressable>
  );
}

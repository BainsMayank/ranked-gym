import { Pressable } from 'react-native';

import { Text, type TextTone } from '@/components';

import type { PlannedSet, SetType } from '../mocks';

export const setTypeInfo: Record<SetType, { mark: string; name: string; tone: TextTone }> = {
  warmup: { mark: 'W', name: 'Warm-up', tone: 'warning' },
  working: { mark: '1', name: 'Working / back-off', tone: 'default' },
  top: { mark: 'T', name: 'Top set', tone: 'primary' },
  drop: { mark: 'D', name: 'Drop set', tone: 'muted' },
  failure: { mark: 'F', name: 'To failure', tone: 'danger' },
  myo: { mark: 'M', name: 'Myo-reps', tone: 'muted' },
};

interface SetTypeBadgeProps {
  type: SetType;
  /** Working sets show their number instead of a letter. */
  number?: number;
  onPress?: () => void;
}

/** Square set marker (W, T, 1, 2, D, F, M). Tap to change the set type. */
export function SetTypeBadge({ type, number, onPress }: SetTypeBadgeProps) {
  const info = setTypeInfo[type];
  const mark = type === 'working' && number ? `${number}` : info.mark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${info.name}${number ? ` ${number}` : ''}. Change set type`}
      onPress={onPress}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-sm bg-surface-raised"
    >
      <Text variant="label" tone={info.tone} numeric>
        {mark}
      </Text>
    </Pressable>
  );
}

/** Working sets are numbered 1, 2, 3…; other set types get no number. */
export function workingNumbers(sets: readonly PlannedSet[]): (number | undefined)[] {
  let n = 0;
  return sets.map((s) => (s.type === 'working' ? ++n : undefined));
}

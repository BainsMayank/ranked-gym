import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components';
import { cn } from '@/lib/utils';

import type { PlannedSet } from '../mocks';
import { SetCell } from './SetCell';
import { SetTypeBadge } from './SetTypeBadge';

interface SetLogRowProps {
  set: PlannedSet;
  index: number;
  workingNumber?: number;
  done: boolean;
  onToggle: () => void;
}

/** One set in a live session: type, last time, kg, reps, effort, done. */
export function SetLogRow({ set, index, workingNumber, done, onToggle }: SetLogRowProps) {
  const n = index + 1;
  return (
    <View
      className={cn(
        'flex-row items-center gap-xs rounded-md px-xs py-xs',
        done && 'bg-surface-raised',
      )}
    >
      <SetTypeBadge type={set.type} number={workingNumber} />
      <Text variant="caption" tone="muted" numeric className="w-16" numberOfLines={1}>
        {set.previous ?? '–'}
      </Text>
      <SetCell
        value={set.kg}
        accessibilityLabel={`Set ${n} weight`}
        className="flex-1 text-center"
      />
      <SetCell
        value={set.reps.split('–')[0] ?? set.reps}
        accessibilityLabel={`Set ${n} reps`}
        className="flex-1 text-center"
      />
      <SetCell
        value={set.effort}
        accessibilityLabel={`Set ${n} effort`}
        className="w-10 text-center"
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Set ${n} done`}
        accessibilityState={{ checked: done }}
        onPress={onToggle}
        hitSlop={4}
        className={cn(
          'h-9 w-11 items-center justify-center rounded-sm',
          done ? 'bg-success' : 'bg-surface-raised',
        )}
      >
        <Icon name="checkmark" size={18} tone={done ? 'background' : 'textMuted'} />
      </Pressable>
    </View>
  );
}

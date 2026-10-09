import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon, Text, type IconName } from '@/components';
import type { Exercise } from '@/lib/exercises';
import type { RoutineListItem } from '@/lib/routines';
import { cn } from '@/lib/utils';
import type { ColorToken } from '@/theme';

import { RoutineCard } from './RoutineCard';

const routineActions = ['duplicate', 'move', 'archive', 'delete'] as const;
export type RoutineAction = (typeof routineActions)[number];

const isRoutineAction = (name: string): name is RoutineAction =>
  (routineActions as readonly string[]).includes(name);

interface RoutineRowProps {
  routine: RoutineListItem;
  library: ReadonlyMap<string, Exercise>;
  onAction: (action: RoutineAction, routine: RoutineListItem) => void;
  onMenu: (routine: RoutineListItem) => void;
}

function SwipeAction({
  icon,
  label,
  tone = 'text',
  danger,
  onPress,
}: {
  icon: IconName;
  label: string;
  tone?: ColorToken;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'w-16 items-center justify-center gap-xxs active:opacity-70',
        danger ? 'bg-danger' : 'bg-surface-raised',
      )}
    >
      <Icon name={icon} size={20} tone={tone} />
      <Text variant="caption" tone={danger ? 'onDanger' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A routine in the hub. Swipe left for Duplicate, Move, Archive and Delete; the same actions are
 * on long press and, for screen readers, as accessibility actions.
 */
export function RoutineRow({ routine, library, onAction, onMenu }: RoutineRowProps) {
  const ref = useRef<SwipeableMethods>(null);
  const run = (action: RoutineAction) => () => {
    ref.current?.close();
    onAction(action, routine);
  };
  const archiveLabel = routine.archived ? 'Restore' : 'Archive';

  return (
    <View className="pb-sm">
      <ReanimatedSwipeable
        ref={ref}
        friction={2}
        rightThreshold={48}
        overshootRight={false}
        renderRightActions={() => (
          <View className="ml-sm flex-row overflow-hidden rounded-lg">
            <SwipeAction icon="copy-outline" label="Copy" onPress={run('duplicate')} />
            <SwipeAction icon="folder-outline" label="Move" onPress={run('move')} />
            <SwipeAction
              icon={routine.archived ? 'arrow-undo-outline' : 'archive-outline'}
              label={archiveLabel}
              onPress={run('archive')}
            />
            <SwipeAction
              icon="trash-outline"
              label="Delete"
              tone="onDanger"
              danger
              onPress={run('delete')}
            />
          </View>
        )}
      >
        <RoutineCard
          routine={routine}
          library={library}
          onLongPress={() => onMenu(routine)}
          accessibilityActions={[
            { name: 'duplicate', label: 'Duplicate' },
            { name: 'move', label: 'Move to folder' },
            { name: 'archive', label: archiveLabel },
            { name: 'delete', label: 'Delete' },
          ]}
          onAccessibilityAction={(e) => {
            const name = e.nativeEvent.actionName;
            if (isRoutineAction(name)) onAction(name, routine);
          }}
        />
      </ReanimatedSwipeable>
    </View>
  );
}

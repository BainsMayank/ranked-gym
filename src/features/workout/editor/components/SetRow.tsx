import { useRef } from 'react';
import { Platform, Pressable, View, type KeyboardTypeOptions } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon } from '@/components';
import type { LogType } from '@/lib/exercises';
import type { RoutineSet } from '@/lib/routines';
import { cn } from '@/lib/utils';

import { SetCell } from '../../components/SetCell';
import { SetTypeBadge } from '../../components/SetTypeBadge';
import { cellText, columnHeader, parseCell, type Column } from '../columns';
import { useEditorEnv } from '../EditorEnv';
import { deleteSet, updateSet } from '../actions';
import { editRoutine, useRoutineEditor } from '../store';

/** "8-10", "85%" and "0:45" need punctuation; iOS has a numeric pad with it, Android doesn't. */
const PUNCTUATED: KeyboardTypeOptions =
  Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default';

function keyboardFor(column: Column): KeyboardTypeOptions {
  if (column === 'rir') return 'number-pad';
  if (column === 'rpe' || column === 'distance') return 'decimal-pad';
  return PUNCTUATED;
}

interface SetRowProps {
  exerciseId: string;
  exerciseName: string;
  sets: readonly RoutineSet[];
  index: number;
  mark: string;
  columns: Column[];
  logType: LogType;
  isDrop: boolean;
}

/** One planned set: its type badge and the cells for this exercise. Swipe left to delete. */
export function SetRow({
  exerciseId,
  exerciseName,
  sets,
  index,
  mark,
  columns,
  logType,
  isDrop,
}: SetRowProps) {
  const { unit } = useEditorEnv();
  const swipeable = useRef<SwipeableMethods>(null);
  const set = sets[index]!;
  const position = `${exerciseName}, set ${index + 1}`;
  const remove = () => editRoutine((d) => deleteSet(d, exerciseId, set.id));

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${position}`}
          onPress={() => {
            swipeable.current?.close();
            remove();
          }}
          className="ml-sm w-16 items-center justify-center rounded-sm bg-danger active:opacity-70"
        >
          <Icon name="trash-outline" size={20} tone="onDanger" />
        </Pressable>
      )}
    >
      <View
        className={cn('flex-row items-center gap-sm bg-surface', isDrop && 'pl-lg')}
        accessibilityActions={[{ name: 'delete', label: 'Delete set' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete') remove();
        }}
      >
        <SetTypeBadge
          type={set.setType}
          mark={mark}
          position={`Set ${index + 1}`}
          onPress={() =>
            useRoutineEditor.getState().openSheet({ kind: 'set', exerciseId, setId: set.id })
          }
        />
        {columns.map((column) => (
          <SetCell
            key={column}
            value={cellText(column, set, unit)}
            keyboardType={keyboardFor(column)}
            accessibilityLabel={`${position}, ${columnHeader(column, logType, unit)}`}
            className={column === 'rir' || column === 'rpe' ? 'w-14' : 'flex-1'}
            onCommit={(text) => {
              const patch = parseCell(column, text, { set, sets, index, logType, unit });
              if (!patch) return false;
              editRoutine((d) => updateSet(d, exerciseId, set.id, patch));
              return true;
            }}
          />
        ))}
      </View>
    </ReanimatedSwipeable>
  );
}

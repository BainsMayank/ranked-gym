import { memo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon, Text } from '@/components';
import type { LogType } from '@/lib/exercises';
import { cn } from '@/lib/utils';
import {
  formatPrevious,
  setE1rm,
  suggestionFor,
  type PreviousSet,
  type WorkoutSet,
} from '@/lib/workouts';
import { fromKg } from '@/lib/units';

import { SetTypeBadge } from '../../components/SetTypeBadge';
import { deleteSet, updateSet } from '../actions';
import { tickSet } from '../controller';
import { useKeypadDraft } from '../draft';
import { registerRow } from '../rowRegistry';
import { draftFor, fieldHeader, fieldNames, formatField, suggestedValue, valueOf } from '../fields';
import { useSessionEnv } from '../SessionEnv';
import { useSession, useSessionStore, type KeypadField } from '../store';
import { KeypadCell } from './KeypadCell';

interface LogSetRowProps {
  exerciseId: string;
  exerciseName: string;
  set: WorkoutSet;
  index: number;
  mark: string;
  fields: KeypadField[];
  logType: LogType;
  isDrop: boolean;
  isNext: boolean;
  previous: PreviousSet | null;
  /** The set before it (same kind), whose values follow on when there's no target. */
  earlier: WorkoutSet | null;
}

/**
 * One set while logging: type, last time (tap to copy), the values (keypad), and the tick. Swipe
 * left to delete. Working sets with a weight and reps show their estimated 1RM.
 */
export const LogSetRow = memo(function LogSetRow({
  exerciseId,
  exerciseName,
  set,
  index,
  mark,
  fields,
  logType,
  isDrop,
  isNext,
  previous,
  earlier,
}: LogSetRowProps) {
  const store = useSessionStore();
  const env = useSessionEnv();
  const swipeable = useRef<SwipeableMethods>(null);
  const activeField = useSession((s) => (s.keypad?.setId === set.id ? s.keypad.field : null));
  const position = `${exerciseName}, set ${index + 1}`;
  const suggestion = suggestionFor(set, previous, earlier);
  const ref = { exerciseId, setId: set.id };
  const e1rm = setE1rm(set);

  const open = (field: KeypadField) => {
    useKeypadDraft.getState().set(draftFor(field, valueOf(set, field), env.unit));
    store.getState().openKeypad({ ...ref, field });
    store.getState().setFocus(ref);
  };
  const copyPrevious = () => {
    if (!previous) return;
    store.getState().apply((d) =>
      updateSet(d, exerciseId, set.id, {
        weightKg: previous.weightKg,
        reps: previous.reps,
        durationSec: previous.durationSec,
        distanceM: previous.distanceM,
      }),
    );
  };
  const remove = () => store.getState().apply((d) => deleteSet(d, exerciseId, set.id));
  const lastTime = previous ? formatPrevious(previous, env.unit) : '';

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
        ref={registerRow(set.id)}
        className={cn(
          'gap-xxs rounded-md bg-surface py-xxs',
          set.completed && 'bg-surface-raised',
          isDrop && 'pl-lg',
        )}
        accessibilityActions={[{ name: 'delete', label: 'Delete set' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete') remove();
        }}
      >
        <View className="flex-row items-center gap-xs">
          <View
            className={cn(
              'rounded-sm border-2',
              isNext && !set.completed
                ? 'border-primary'
                : set.completed
                  ? 'border-surface-raised'
                  : 'border-surface',
            )}
          >
            <SetTypeBadge
              type={set.setType}
              mark={mark}
              position={`Set ${index + 1}`}
              onPress={() => store.getState().openSheet({ kind: 'set', exerciseId, setId: set.id })}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              lastTime ? `Last time ${lastTime}. Copy into this set` : 'No previous set'
            }
            disabled={!previous}
            onPress={copyPrevious}
            hitSlop={6}
            className="w-16 justify-center active:opacity-70"
          >
            <Text variant="caption" tone="muted" numeric numberOfLines={1} adjustsFontSizeToFit>
              {lastTime || '–'}
            </Text>
          </Pressable>
          {fields.map((field) => {
            const suggested = suggestedValue(suggestion, field, set);
            return (
              <KeypadCell
                key={field}
                value={formatField(field, valueOf(set, field), env.unit)}
                // A done set shows what was logged; suggestions are for sets still to do.
                suggestion={set.completed ? '' : formatField(field, suggested, env.unit)}
                active={activeField === field}
                accessibilityLabel={`${position}, ${fieldNames[field]} (${fieldHeader(field, logType, env.unit)})`}
                onPress={() => open(field)}
                className={field === 'rir' || field === 'rpe' ? 'w-12' : 'flex-1'}
              />
            );
          })}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`${position} done`}
            accessibilityState={{ checked: set.completed }}
            accessibilityHint={set.failed ? 'Marked as missed' : undefined}
            onPress={() => tickSet(store, ref, suggestion, env.nameOf)}
            hitSlop={4}
            className={cn(
              'h-12 w-12 items-center justify-center rounded-sm',
              set.completed ? (set.failed ? 'bg-danger' : 'bg-success') : 'bg-surface-raised',
            )}
          >
            <Icon
              name={set.failed ? 'close' : 'checkmark'}
              size={22}
              tone={set.completed ? (set.failed ? 'onDanger' : 'background') : 'textMuted'}
            />
          </Pressable>
        </View>
        {e1rm !== null ? (
          <Text
            variant="caption"
            tone="muted"
            numeric
            className="text-right"
            accessibilityLabel={`Estimated one rep max ${fromKg(e1rm, env.unit, 0.5)} ${env.unit}`}
          >
            e1RM {fromKg(e1rm, env.unit, 0.5)} {env.unit}
          </Text>
        ) : null}
      </View>
    </ReanimatedSwipeable>
  );
});

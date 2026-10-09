import { randomUUID } from 'expo-crypto';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Icon, IconButton, Text } from '@/components';
import { muscleShortLabels, musclesWithRole } from '@/lib/exercises';
import {
  dropParentIndex,
  newSet,
  setMarks,
  warmupTarget,
  type RoutineExercise,
  type SupersetPosition,
} from '@/lib/routines';
import { cn } from '@/lib/utils';

import { addSet } from '../actions';
import { columnHeader, columnsFor, distanceTargetOf } from '../columns';
import { useEditorEnv } from '../EditorEnv';
import { equipmentIcon } from '../equipmentIcon';
import { editRoutine, useRoutineEditor } from '../store';
import { ExerciseCardControls } from './ExerciseCardControls';
import { SetRow } from './SetRow';

interface ExerciseCardProps {
  exercise: RoutineExercise;
  superset: SupersetPosition | null;
  selecting: boolean;
  selected: boolean;
}

/**
 * One exercise in the editor: name and muscles, rest and notes, then the set table. Superset
 * members carry a rail on the left and an A1/A2 label. Long-press selects (for Make superset).
 */
export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  superset,
  selecting,
  selected,
}: ExerciseCardProps) {
  const env = useEditorEnv();
  const info = env.exercises.get(exercise.exerciseId);
  const name = info?.name ?? 'Exercise not in library';
  const logType = info?.logType ?? 'weight_reps';
  const columns = columnsFor(logType, env.effort, distanceTargetOf(exercise.sets));
  const marks = setMarks(exercise.sets);
  const muscles = info
    ? musclesWithRole(info, 'primary')
        .map((m) => muscleShortLabels[m])
        .join(' · ')
    : '';
  const { toggleSelected, setMode, openSheet } = useRoutineEditor.getState();

  const startSelecting = () => {
    setMode('select');
    toggleSelected(exercise.id);
  };

  return (
    <View className={cn(superset && !superset.last ? 'pb-xs' : 'pb-md', superset && 'pl-md')}>
      {superset ? (
        <View
          className={cn(
            'absolute bottom-0 left-0 top-0 w-0.5 bg-primary',
            superset.first && 'top-lg',
            superset.last && 'bottom-xl',
          )}
        />
      ) : null}
      <View
        className={cn(
          'gap-md rounded-lg bg-surface p-lg',
          selected ? 'border-2 border-text' : 'border-t border-edge',
        )}
      >
        <Pressable
          onLongPress={selecting ? undefined : startSelecting}
          onPress={selecting ? () => toggleSelected(exercise.id) : undefined}
          delayLongPress={350}
          accessibilityRole={selecting ? 'checkbox' : 'text'}
          accessibilityState={selecting ? { checked: selected } : undefined}
          accessibilityLabel={[superset && `${superset.letter}${superset.index}`, name, muscles]
            .filter(Boolean)
            .join(', ')}
          accessibilityActions={selecting ? undefined : [{ name: 'select', label: 'Select' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'select') startSelecting();
          }}
          className="flex-row items-start gap-md"
        >
          <View className="h-9 w-9 items-center justify-center rounded-sm bg-surface-raised">
            <Icon name={equipmentIcon(info?.equipment)} size={18} tone="textMuted" />
          </View>
          <View className="flex-1 gap-xxs">
            {superset ? (
              <Text variant="overline" tone="primary">
                {`${superset.letter}${superset.index} · Superset`}
              </Text>
            ) : null}
            <Text variant="subheading" numberOfLines={2}>
              {name}
            </Text>
            {muscles ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {muscles}
              </Text>
            ) : null}
          </View>
          {selecting ? (
            <Icon
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              tone={selected ? 'text' : 'textMuted'}
            />
          ) : (
            <IconButton
              icon="ellipsis-horizontal"
              size="sm"
              accessibilityLabel={`${name} options`}
              onPress={() => openSheet({ kind: 'menu', exerciseId: exercise.id })}
            />
          )}
        </Pressable>

        <ExerciseCardControls
          exercise={exercise}
          superset={superset}
          equipment={info?.equipment}
          canWarmUp={logType === 'weight_reps' && !!warmupTarget(exercise.sets)}
          logType={logType}
        />

        <View className="gap-sm">
          <View className="flex-row gap-sm" importantForAccessibility="no-hide-descendants">
            <Text variant="overline" tone="muted" className="w-10 text-center">
              Set
            </Text>
            {columns.map((c) => (
              <Text
                key={c}
                variant="overline"
                tone="muted"
                className={cn('text-center', c === 'rir' || c === 'rpe' ? 'w-14' : 'flex-1')}
              >
                {columnHeader(c, logType, env.unit)}
              </Text>
            ))}
          </View>
          {exercise.sets.map((s, i) => (
            <SetRow
              key={s.id}
              exerciseId={exercise.id}
              exerciseName={name}
              sets={exercise.sets}
              index={i}
              mark={marks[i]!}
              columns={columns}
              logType={logType}
              isDrop={dropParentIndex(exercise.sets, i) !== null}
            />
          ))}
        </View>
        <Button
          label="Add set"
          icon="add"
          variant="secondary"
          size="sm"
          fullWidth
          accessibilityLabel={`Add set to ${name}`}
          onPress={() =>
            editRoutine((d) =>
              addSet(d, exercise.id, () => newSet(logType, randomUUID(), env.effort), randomUUID),
            )
          }
        />
      </View>
    </View>
  );
});

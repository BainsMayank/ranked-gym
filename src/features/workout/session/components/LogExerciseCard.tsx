import { randomUUID } from 'expo-crypto';
import { memo } from 'react';
import { View } from 'react-native';

import { Button, IconButton, Text } from '@/components';
import { muscleShortLabels, musclesWithRole } from '@/lib/exercises';
import { dropParentIndex, setMarks, type SupersetPosition } from '@/lib/routines';
import { cn } from '@/lib/utils';
import { earlierSet, matchPrevious } from '@/lib/workouts';

import { addSet } from '../actions';
import { fieldHeader, logFieldsFor } from '../fields';
import { useSessionEnv } from '../SessionEnv';
import { useSession, useSessionStore } from '../store';
import { LogSetRow } from './LogSetRow';

interface LogExerciseCardProps {
  exerciseId: string;
  superset: SupersetPosition | null;
}

/**
 * One exercise while logging. Subscribes to its own exercise only, so ticking a set elsewhere never
 * re-renders it. Superset members carry the orange rail and their A1/A2 label.
 */
export const LogExerciseCard = memo(function LogExerciseCard({
  exerciseId,
  superset,
}: LogExerciseCardProps) {
  const store = useSessionStore();
  const env = useSessionEnv();
  const exercise = useSession((s) => s.doc?.exercises.find((e) => e.id === exerciseId));
  const focusSetId = useSession((s) => (s.focus?.exerciseId === exerciseId ? s.focus.setId : null));
  if (!exercise) return null;

  const info = env.exercises.get(exercise.exerciseId);
  const name = info?.name ?? 'Exercise not in library';
  const logType = info?.logType ?? 'weight_reps';
  const fields = logFieldsFor(logType, env.effort);
  const marks = setMarks(exercise.sets);
  const previous = matchPrevious(exercise.sets, env.previous.get(exercise.exerciseId) ?? []);
  const muscles = info
    ? musclesWithRole(info, 'primary')
        .map((m) => muscleShortLabels[m])
        .join(' · ')
    : '';
  const barbell = info?.equipment === 'barbell';

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
      <View className="gap-md rounded-lg border-t border-edge bg-surface p-md">
        <View className="flex-row items-start gap-sm">
          <View className="flex-1 gap-xxs">
            {superset ? (
              <Text variant="overline" tone="primary">
                {`${superset.letter}${superset.index} · Superset`}
              </Text>
            ) : null}
            <Text variant="heading" numberOfLines={2}>
              {name}
            </Text>
            {muscles ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {muscles}
              </Text>
            ) : null}
            {exercise.notes ? (
              <Text variant="caption" numberOfLines={3}>
                {exercise.notes}
              </Text>
            ) : null}
          </View>
          <IconButton
            icon="ellipsis-horizontal"
            size="sm"
            accessibilityLabel={`${name} options`}
            onPress={() => store.getState().openSheet({ kind: 'exercise', exerciseId })}
          />
        </View>

        <View className="gap-xs">
          <View className="flex-row gap-xs" importantForAccessibility="no-hide-descendants">
            <Text variant="overline" tone="muted" className="w-10 text-center">
              Set
            </Text>
            <Text variant="overline" tone="muted" className="w-16">
              Last
            </Text>
            {fields.map((f) => (
              <Text
                key={f}
                variant="overline"
                tone="muted"
                className={cn('text-center', f === 'rir' || f === 'rpe' ? 'w-12' : 'flex-1')}
              >
                {fieldHeader(f, logType, env.unit)}
              </Text>
            ))}
            <View className="w-12" />
          </View>
          {exercise.sets.map((s, i) => (
            <LogSetRow
              key={s.id}
              exerciseId={exerciseId}
              exerciseName={name}
              set={s}
              index={i}
              mark={marks[i]!}
              fields={fields}
              logType={logType}
              isDrop={dropParentIndex(exercise.sets, i) !== null}
              isNext={focusSetId === s.id}
              previous={previous[i] ?? null}
              earlier={earlierSet(exercise.sets, i)}
            />
          ))}
        </View>

        <View className="flex-row gap-sm">
          <Button
            label="Add set"
            icon="add"
            variant="secondary"
            size="sm"
            className="flex-1"
            accessibilityLabel={`Add set to ${name}`}
            onPress={() =>
              store.getState().apply((d) => addSet(d, exerciseId, logType, randomUUID))
            }
          />
          {barbell ? (
            <Button
              label="Plates"
              icon="barbell-outline"
              variant="secondary"
              size="sm"
              accessibilityLabel={`Plate calculator for ${name}`}
              onPress={() => {
                const next = exercise.sets.find((s) => !s.completed) ?? exercise.sets[0];
                store.getState().openSheet({
                  kind: 'plates',
                  targetKg: next?.weightKg ?? next?.targetWeightKg ?? null,
                });
              }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
});

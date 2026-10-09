import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button, Chip, SegmentedControl, showToast } from '@/components';
import type { Equipment, LogType } from '@/lib/exercises';
import {
  applyWarmups,
  formatRest,
  newSet,
  ROUTINE_LIMITS,
  type RoutineExercise,
  type SupersetPosition,
} from '@/lib/routines';
import { fontFamilies, useTheme } from '@/theme';

import { updateExercise } from '../actions';
import { useEditorEnv } from '../EditorEnv';
import { editRoutine, useRoutineEditor } from '../store';

const TARGETS = [
  { value: 'distance', label: 'Distance' },
  { value: 'duration', label: 'Time' },
] as const;

interface Props {
  exercise: RoutineExercise;
  superset: SupersetPosition | null;
  equipment: Equipment | undefined;
  logType: LogType;
  canWarmUp: boolean;
}

/** Rest chip(s), the distance/time switch for cardio, the warm-up generator and the note. */
export function ExerciseCardControls({ exercise, superset, equipment, logType, canWarmUp }: Props) {
  const { colors } = useTheme();
  const env = useEditorEnv();
  const openRest = () =>
    useRoutineEditor.getState().openSheet({ kind: 'rest', exerciseId: exercise.id });
  const [note, setNote] = useState(exercise.notes ?? '');
  const [shownNote, setShownNote] = useState(exercise.notes);
  if (exercise.notes !== shownNote) {
    setShownNote(exercise.notes);
    setNote(exercise.notes ?? '');
  }

  const restLabel = superset
    ? superset.last
      ? `Round rest ${formatRest(exercise.restAfterSupersetSeconds ?? 0)}`
      : exercise.restSeconds === 0
        ? 'No rest to next'
        : `Rest ${formatRest(exercise.restSeconds)} to next`
    : `Rest ${formatRest(exercise.restSeconds)}`;

  const warmUp = () => {
    editRoutine((d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        e.id === exercise.id ? applyWarmups(e, equipment ?? 'other', env.barKg, randomUUID) : e,
      ),
    }));
    showToast({
      message: 'Warm-up sets added',
      actionLabel: 'Undo',
      onAction: () => useRoutineEditor.getState().undo(),
      above: 'footer',
    });
  };

  return (
    <View className="gap-md">
      <View className="flex-row flex-wrap items-center gap-sm">
        <Chip
          label={restLabel}
          icon="timer-outline"
          onPress={openRest}
          accessibilityLabel={`${restLabel}. Change rest`}
        />
        {canWarmUp ? (
          <Button label="Warm-ups" icon="trending-up" variant="ghost" size="sm" onPress={warmUp} />
        ) : null}
      </View>
      {logType === 'distance_duration' ? (
        <SegmentedControl
          accessibilityLabel="Target"
          options={TARGETS}
          value={exercise.sets[0]?.targetType === 'duration' ? 'duration' : 'distance'}
          onChange={(target) =>
            editRoutine((d) =>
              updateExercise(d, exercise.id, {
                sets: exercise.sets.map((s) => {
                  const fresh = newSet(logType, s.id, env.effort);
                  return target === 'duration'
                    ? {
                        ...s,
                        targetType: 'duration',
                        durationSec: s.durationSec ?? 600,
                        distanceM: null,
                      }
                    : {
                        ...s,
                        targetType: 'distance',
                        distanceM: s.distanceM ?? fresh.distanceM,
                        durationSec: null,
                      };
                }),
              }),
            )
          }
        />
      ) : null}
      <TextInput
        value={note}
        onChangeText={setNote}
        onEndEditing={(e) => {
          const next = (e.nativeEvent.text ?? note).trim() || null;
          if (next !== exercise.notes) {
            editRoutine((d) => updateExercise(d, exercise.id, { notes: next }));
          }
        }}
        placeholder="Add a note (cues, seat height)"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        accessibilityLabel="Exercise note"
        maxLength={ROUTINE_LIMITS.textMax}
        multiline
        className="min-h-11 rounded-sm bg-surface-raised px-md py-sm text-text"
        style={{ fontFamily: fontFamilies.regular, fontSize: 13 }}
      />
    </View>
  );
}

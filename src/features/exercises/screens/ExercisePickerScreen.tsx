import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Screen } from '@/components';
import { resolvePickRequest, useRecordExerciseUse, type Exercise } from '@/lib/exercises';

import { ExerciseBrowser } from '../components/ExerciseBrowser';

type Params = { request?: string; multiple?: string; exclude?: string };

/**
 * Picks one or several exercises for whoever opened it (useExercisePicker). Closing any other way
 * than confirming resolves the request with nothing picked.
 */
export function ExercisePickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const request = params.request ?? '';
  const multiple = params.multiple === '1';
  const addedIds = useMemo(
    () => new Set((params.exclude ?? '').split(',').filter(Boolean)),
    [params.exclude],
  );
  const [selected, setSelected] = useState<Exercise[]>([]);
  const selectedIds = useMemo(() => new Set(selected.map((e) => e.id)), [selected]);
  const { mutate: recordUse } = useRecordExerciseUse();

  useEffect(() => () => resolvePickRequest(request, []), [request]);

  const finish = useCallback(
    (picked: Exercise[]) => {
      recordUse(picked.map((e) => e.id));
      resolvePickRequest(request, picked);
      router.back();
    },
    [recordUse, request, router],
  );

  const onPick = useCallback(
    (exercise: Exercise) => {
      if (!multiple) return finish([exercise]);
      setSelected((prev) =>
        prev.some((e) => e.id === exercise.id)
          ? prev.filter((e) => e.id !== exercise.id)
          : [...prev, exercise],
      );
    },
    [multiple, finish],
  );

  const onInfo = useCallback(
    (exercise: Exercise) =>
      router.push({ pathname: '/exercises/[id]', params: { id: exercise.id } }),
    [router],
  );

  const count = selected.length;
  return (
    <Screen
      title={multiple ? 'Add exercises' : 'Choose exercise'}
      onBack={() => router.back()}
      edges={['top', 'bottom']}
      footer={
        multiple ? (
          <Button
            label={
              count === 0
                ? 'Select exercises'
                : `Add ${count} ${count === 1 ? 'exercise' : 'exercises'}`
            }
            disabled={count === 0}
            fullWidth
            onPress={() => finish(selected)}
          />
        ) : undefined
      }
    >
      <ExerciseBrowser
        multiple={multiple}
        selectedIds={selectedIds}
        addedIds={addedIds}
        onPick={onPick}
        onInfo={onInfo}
      />
    </Screen>
  );
}

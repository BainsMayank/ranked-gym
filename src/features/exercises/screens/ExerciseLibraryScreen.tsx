import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { IconButton, Screen } from '@/components';
import type { Exercise } from '@/lib/exercises';

import { ExerciseBrowser } from '../components/ExerciseBrowser';

/** Workout → Exercise library: browse and search every exercise, open one, or make your own. */
export function ExerciseLibraryScreen() {
  const router = useRouter();
  const open = useCallback(
    (exercise: Exercise) =>
      router.push({ pathname: '/exercises/[id]', params: { id: exercise.id } }),
    [router],
  );

  return (
    <Screen
      title="Exercise library"
      onBack={() => router.back()}
      headerRight={
        <IconButton
          icon="add"
          variant="surface"
          accessibilityLabel="Create a custom exercise"
          onPress={() => router.push('/exercises/new')}
        />
      }
      edges={['top', 'bottom']}
    >
      <ExerciseBrowser onPick={open} />
    </Screen>
  );
}

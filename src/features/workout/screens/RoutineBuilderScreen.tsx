import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Chip, Screen, Tag, Text } from '@/components';
import { useExercisePicker } from '@/lib/exercises';

import { ExerciseEditorCard } from '../components/ExerciseEditorCard';
import { SetTypeLegend } from '../components/SetTypeLegend';
import { SupersetGroup } from '../components/SupersetGroup';
import { routineExerciseFromLibrary } from '../fromLibrary';
import { findRoutine, type RoutineExercise } from '../mocks';

/** Groups consecutive exercises that share a superset letter. */
function groupExercises(list: RoutineExercise[]) {
  const groups: { key: string; superset?: string; items: RoutineExercise[] }[] = [];
  for (const e of list) {
    const prev = groups[groups.length - 1];
    if (e.superset && prev?.superset === e.superset) prev.items.push(e);
    else groups.push({ key: e.id, superset: e.superset, items: [e] });
  }
  return groups;
}

/** Routine builder: settings, then each exercise (or superset) with its planned sets. Saving lands in Phase 3. */
export function RoutineBuilderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routine = findRoutine(id);
  // Local until routines are stored (Phase 3).
  const [exercises, setExercises] = useState(routine.exercises);
  const pickExercises = useExercisePicker();

  const addExercises = async () => {
    const picked = await pickExercises({ multiple: true, exclude: exercises.map((e) => e.id) });
    setExercises((prev) => [...prev, ...picked.map(routineExerciseFromLibrary)]);
  };

  return (
    <Screen
      title="Edit routine"
      onBack={() => router.back()}
      headerRight={<Button label="Save" size="sm" onPress={() => router.back()} />}
      edges={['top', 'bottom']}
      scroll
    >
      <View className="gap-lg">
        <View className="gap-sm">
          <Text variant="display">{routine.name}</Text>
          <View className="flex-row flex-wrap gap-sm">
            <Chip label={`Folder: ${routine.folder}`} onPress={() => undefined} />
            <Chip label="Effort: RIR" onPress={() => undefined} />
            <Chip label="Progression: double" onPress={() => undefined} />
          </View>
          <Tag label="5 exercises · 17 sets · ~62 min" tone="primary" className="self-start" />
        </View>
        {groupExercises(exercises).map((g) =>
          g.superset && g.items.length > 1 ? (
            <SupersetGroup key={g.key} label={g.superset} exercises={g.items} />
          ) : (
            <ExerciseEditorCard key={g.key} exercise={g.items[0]!} />
          ),
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add exercise"
          onPress={() => void addExercises()}
          className="min-h-12 items-center justify-center rounded-lg border border-dashed border-border active:opacity-70"
        >
          <Text variant="subheading">+ Add exercise</Text>
        </Pressable>
        <SetTypeLegend />
      </View>
    </Screen>
  );
}

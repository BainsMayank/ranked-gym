import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { EmptyState, IconButton, Screen, Tag, TopTabs } from '@/components';
import {
  categoryLabels,
  equipmentLabels,
  isCustomExercise,
  logTypeLabels,
  useDeleteCustomExercise,
  useExercise,
  type Exercise,
} from '@/lib/exercises';

import { ExerciseAbout } from '../components/ExerciseAbout';
import { ExerciseHistoryList } from '../components/ExerciseHistoryList';

const tabs = [
  { key: 'about', label: 'About' },
  { key: 'history', label: 'History' },
  { key: 'records', label: 'Records' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

/** Exercise detail: muscles and how-to, your history with it, and records (Phase 6). */
export function ExerciseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: exercise, isPending } = useExercise(id);
  const [tab, setTab] = useState<TabKey>('about');

  if (!exercise) {
    return (
      <Screen onBack={() => router.back()} edges={['top', 'bottom']}>
        {isPending ? null : (
          <EmptyState
            icon="help-circle-outline"
            title="Exercise not found"
            description="It may have been deleted."
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen
      title={exercise.name}
      onBack={() => router.back()}
      headerRight={isCustomExercise(exercise) ? <CustomActions exercise={exercise} /> : null}
      edges={['top', 'bottom']}
      scroll
    >
      <View className="gap-lg">
        <View className="flex-row flex-wrap gap-sm">
          {exercise.isRankable ? <Tag label="Ranked" tone="primary" icon="trophy-outline" /> : null}
          {isCustomExercise(exercise) ? <Tag label="Custom" /> : null}
          <Tag label={equipmentLabels[exercise.equipment]} />
          <Tag label={categoryLabels[exercise.category]} />
          <Tag label={logTypeLabels[exercise.logType].label} />
          {exercise.unilateral ? <Tag label="One side at a time" /> : null}
        </View>
        <TopTabs tabs={tabs} activeKey={tab} onChange={(key) => setTab(key as TabKey)} />
        {tab === 'about' ? <ExerciseAbout exercise={exercise} /> : null}
        {tab === 'history' ? <ExerciseHistoryList exerciseId={exercise.id} /> : null}
        {tab === 'records' ? (
          <EmptyState
            icon="trophy-outline"
            title="No records yet"
            description="Your best weight, reps and estimated 1RM will show here."
          />
        ) : null}
      </View>
    </Screen>
  );
}

function CustomActions({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const remove = useDeleteCustomExercise();

  const confirmDelete = () =>
    Alert.alert(`Delete ${exercise.name}?`, 'This removes your custom exercise.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(exercise.id, {
            onSuccess: () => router.back(),
            onError: () => Alert.alert('Couldn’t delete', 'Check your connection and try again.'),
          }),
      },
    ]);

  return (
    <View className="flex-row gap-xs">
      <IconButton
        icon="create-outline"
        variant="surface"
        accessibilityLabel={`Edit ${exercise.name}`}
        onPress={() => router.push({ pathname: '/exercises/new', params: { id: exercise.id } })}
      />
      <IconButton
        icon="trash-outline"
        variant="surface"
        accessibilityLabel={`Delete ${exercise.name}`}
        disabled={remove.isPending}
        onPress={confirmDelete}
      />
    </View>
  );
}

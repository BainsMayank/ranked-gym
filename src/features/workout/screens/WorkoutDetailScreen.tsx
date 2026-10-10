import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, View } from 'react-native';

import { EmptyState, IconButton, Screen, Tag, Text, LoggedExercise } from '@/components';
import { useExercises } from '@/lib/exercises';
import { useProfile } from '@/lib/profile';
import {
  effortWord,
  summariseWorkout,
  useDeleteWorkout,
  useWorkoutRecord,
  visibilityLabels,
} from '@/lib/workouts';

import { WorkoutStats } from '../finish/WorkoutStats';
import { formatWorkoutDate } from '../history/format';
import { WorkoutPhoto } from '../history/WorkoutPhoto';
import { WorkoutRewardsSection } from '../rewards/WorkoutRewardsSection';

/** One finished workout: totals, how it felt, notes, photo and every set. Edit or delete it. */
export function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: record, isPending } = useWorkoutRecord(id);
  const { data: library } = useExercises();
  const { data: profile } = useProfile();
  const remove = useDeleteWorkout();
  const unit = profile?.units ?? 'kg';
  const byId = useMemo(() => new Map((library ?? []).map((e) => [e.id, e])), [library]);
  const doc = record?.doc;
  const summary = useMemo(
    () => (doc ? summariseWorkout(doc, (x) => byId.get(x)) : null),
    [doc, byId],
  );

  if (!doc || !summary || doc.status !== 'completed') {
    return (
      <Screen onBack={() => router.back()} edges={['top', 'bottom']}>
        {isPending ? null : (
          <EmptyState
            icon="help-circle-outline"
            title="Workout not found"
            description="It may have been deleted."
          />
        )}
      </Screen>
    );
  }

  const confirmDelete = () =>
    Alert.alert(`Delete “${doc.name}”?`, 'It comes off your history on every device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate(doc.id, { onSuccess: () => router.back() }),
      },
    ]);

  return (
    <Screen
      title={doc.name}
      subtitle={formatWorkoutDate(doc.startedAt)}
      onBack={() => router.back()}
      headerRight={
        <View className="flex-row">
          <IconButton
            icon="create-outline"
            accessibilityLabel="Edit workout"
            onPress={() => router.push({ pathname: '/workouts/[id]/edit', params: { id: doc.id } })}
          />
          <IconButton
            icon="trash-outline"
            accessibilityLabel="Delete workout"
            onPress={confirmDelete}
          />
        </View>
      }
      edges={['top', 'bottom']}
      scroll
    >
      <View className="gap-xl">
        <WorkoutStats summary={summary} unit={unit} />
        <View className="flex-row flex-wrap gap-sm">
          <Tag label={visibilityLabels[doc.visibility]} icon="eye-outline" />
          {doc.perceivedEffort ? (
            <Tag label={`Effort ${doc.perceivedEffort} · ${effortWord(doc.perceivedEffort)}`} />
          ) : null}
          {doc.revision > 0 ? <Tag label="Edited" icon="create-outline" /> : null}
        </View>
        {doc.notes ? <Text variant="body">{doc.notes}</Text> : null}
        <WorkoutPhoto uri={record.photoUri} path={doc.photoPath} />
        <WorkoutRewardsSection workoutId={doc.id} unit={unit} />
        <View className="gap-sm">
          {doc.exercises.map((e) => (
            <LoggedExercise
              key={e.id}
              exercise={e}
              name={byId.get(e.exerciseId)?.name ?? 'Exercise'}
              unit={unit}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

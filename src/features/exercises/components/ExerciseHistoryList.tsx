import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, PressableScale, Skeleton, Text } from '@/components';
import { useProfile } from '@/lib/profile';
import { setMarks } from '@/lib/routines';
import { formatPrevious, useExerciseHistory } from '@/lib/workouts';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Every time you did this exercise, newest first; tap one to open the workout. Offline. */
export function ExerciseHistoryList({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const { data: entries, isPending } = useExerciseHistory(exerciseId);
  const { data: profile } = useProfile();
  const unit = profile?.units ?? 'kg';

  if (isPending) return <Skeleton height={96} />;
  if (!entries?.length) {
    return (
      <EmptyState
        icon="time-outline"
        title="No sets yet"
        description="Every set you log for this exercise will show here."
      />
    );
  }
  return (
    <View className="gap-sm">
      {entries.slice(0, 50).map((entry) => {
        const marks = setMarks(entry.sets);
        return (
          <PressableScale
            key={entry.workoutId}
            accessibilityRole="button"
            accessibilityLabel={`${entry.workoutName}, ${formatDate(entry.startedAt)}, ${entry.sets.length} sets. Open workout`}
            onPress={() =>
              router.push({ pathname: '/workouts/[id]', params: { id: entry.workoutId } })
            }
            className="gap-xs rounded-lg border-t border-edge bg-surface p-lg"
          >
            <Text variant="overline" tone="muted">
              {formatDate(entry.startedAt)}
            </Text>
            <Text variant="subheading" numberOfLines={1}>
              {entry.workoutName}
            </Text>
            {entry.sets.map((s, i) => (
              <View key={s.id} className="flex-row gap-md">
                <Text variant="label" tone="muted" numeric className="w-6 text-center">
                  {marks[i]}
                </Text>
                <Text variant="body" numeric>
                  {formatPrevious(s, unit) || '–'}
                </Text>
              </View>
            ))}
          </PressableScale>
        );
      })}
    </View>
  );
}

import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, Screen, Skeleton, SyncStatus, Text } from '@/components';
import { useExercises } from '@/lib/exercises';
import { useProfile } from '@/lib/profile';
import { useWorkoutHistory, type WorkoutListItem } from '@/lib/workouts';

import { monthOf } from '../history/format';
import { HistoryRow } from '../history/HistoryRow';

type Item =
  | { type: 'month'; key: string; label: string }
  | { type: 'workout'; key: string; workout: WorkoutListItem };

/** Every finished workout, newest first, grouped by month. Works offline. */
export function HistoryScreen() {
  const router = useRouter();
  const { data: history, isPending } = useWorkoutHistory();
  const { data: library } = useExercises();
  const { data: profile } = useProfile();
  const byId = useMemo(() => new Map((library ?? []).map((e) => [e.id, e])), [library]);
  const unit = profile?.units ?? 'kg';

  const items = useMemo(() => {
    const out: Item[] = [];
    let month = '';
    for (const w of history ?? []) {
      const m = monthOf(w.startedAt);
      if (m !== month) {
        month = m;
        out.push({ type: 'month', key: `m-${m}`, label: m });
      }
      out.push({ type: 'workout', key: w.id, workout: w });
    }
    return out;
  }, [history]);

  const open = (id: string) => router.push({ pathname: '/workouts/[id]', params: { id } });

  return (
    <Screen
      title="History"
      onBack={() => router.back()}
      headerRight={<SyncStatus showLabel />}
      edges={['top', 'bottom']}
    >
      {isPending ? (
        <View className="gap-sm">
          <Skeleton height={96} />
          <Skeleton height={96} />
        </View>
      ) : items.length === 0 ? (
        <View className="gap-lg">
          <EmptyState
            icon="time-outline"
            title="No workouts yet"
            description="Finish a workout and it shows up here, even offline."
          />
          <Button
            label="Go to Workout"
            variant="secondary"
            onPress={() => router.navigate('/workout')}
          />
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(i) => i.key}
          getItemType={(i) => i.type}
          extraData={byId}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) =>
            item.type === 'month' ? (
              <Text variant="overline" tone="muted" className="pb-sm pt-md">
                {item.label}
              </Text>
            ) : (
              <HistoryRow workout={item.workout} library={byId} unit={unit} onPress={open} />
            )
          }
        />
      )}
    </Screen>
  );
}

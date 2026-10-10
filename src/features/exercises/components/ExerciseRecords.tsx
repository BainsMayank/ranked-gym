import { useMemo } from 'react';
import { View } from 'react-native';

import { EmptyState, ListGroup, ListItem, Skeleton, Tag } from '@/components';
import {
  groupRecords,
  RECORD_KIND_LABELS,
  recordSet,
  recordValue,
  usePersonalRecords,
  useServerReads,
} from '@/lib/ranks';
import { useProfile } from '@/lib/profile';

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** This exercise's current bests (records are computed on the server from synced workouts). */
export function ExerciseRecords({ exerciseId }: { exerciseId: string }) {
  const signedIn = useServerReads();
  const records = usePersonalRecords();
  const unit = useProfile().data?.units ?? 'kg';
  const group = useMemo(
    () =>
      groupRecords(
        (records.data ?? []).filter((r) => r.exerciseId === exerciseId),
        { kind: 'all', since: null },
      )[0],
    [records.data, exerciseId],
  );

  if (records.isLoading) return <Skeleton height={160} radius="lg" />;
  if (!signedIn || !group) {
    return (
      <EmptyState
        icon="trophy-outline"
        title="No records yet"
        description={
          signedIn
            ? 'Your best weight, reps and estimated 1RM show here once a workout with it syncs.'
            : 'Sign in to keep records; they’re worked out from the workouts you sync.'
        }
      />
    );
  }

  return (
    <View className="gap-md">
      <ListGroup>
        {group.bests.map((b) => {
          const set = recordSet(b, unit);
          return (
            <ListItem
              key={`${b.kind}:${b.weightKg ?? ''}`}
              title={RECORD_KIND_LABELS[b.kind]}
              subtitle={`${set ? `${set} · ` : ''}${DATE.format(new Date(b.achievedAt))}`}
              value={recordValue(b, unit)}
              trailing={b.previousValue === null ? <Tag label="Baseline" /> : undefined}
            />
          );
        })}
      </ListGroup>
    </View>
  );
}

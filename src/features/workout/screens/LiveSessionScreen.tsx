import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, IconButton, ListGroup, ListItem, Screen, Stat, Text } from '@/components';

import { ActiveExerciseCard } from '../components/ActiveExerciseCard';
import { RestTimerCard } from '../components/RestTimerCard';
import { formatClock, useTicker } from '../hooks/useTicker';
import { findRoutine, session } from '../mocks';

/** Live workout (full-screen modal). Local-first logging lands in Phase 4; this is the layout. */
export function LiveSessionScreen() {
  const router = useRouter();
  const { routine: routineId } = useLocalSearchParams<{ routine?: string }>();
  const routine = findRoutine(routineId ?? session.routineId);
  const elapsed = useTicker() + session.startedSecondsAgo;
  const [active, ...rest] = routine.exercises;

  return (
    <Screen edges={['top', 'bottom']} scroll className="pt-sm">
      <View className="gap-lg">
        <View className="flex-row items-center gap-md">
          <IconButton
            icon="chevron-down"
            accessibilityLabel="Minimise workout"
            variant="surface"
            onPress={() => router.back()}
          />
          <View className="flex-1">
            <Text variant="overline" tone="muted">
              {routine.name}
            </Text>
            <Text variant="title" numeric accessibilityLabel={`Elapsed ${formatClock(elapsed)}`}>
              {formatClock(elapsed)}
            </Text>
          </View>
          <Button label="Finish" onPress={() => router.back()} />
        </View>

        <View className="flex-row gap-sm">
          <Stat label="Volume" value={session.stats.volume} boxed className="flex-1" />
          <Stat label="Sets" value={session.stats.sets} boxed className="flex-1" />
          <Stat label="Est. kcal" value={session.stats.kcal} boxed className="flex-1" />
        </View>

        <RestTimerCard seconds={session.restSeconds} next={session.next} />
        {active ? <ActiveExerciseCard exercise={active} /> : null}

        <ListGroup>
          {rest.map((e) => (
            <ListItem
              key={e.id}
              title={e.superset ? `Superset ${e.superset} · ${e.name}` : e.name}
              subtitle={`${e.sets.length} sets · ${e.sets[0]?.kg} kg × ${e.sets[0]?.reps}`}
              onPress={() => undefined}
            />
          ))}
        </ListGroup>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add exercise"
          onPress={() => undefined}
          className="min-h-12 items-center justify-center rounded-lg border border-dashed border-border active:opacity-70"
        >
          <Text variant="subheading">+ Add exercise</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

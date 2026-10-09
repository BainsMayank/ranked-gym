import { useRouter } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { IconButton, PressableScale, Tag, Text, type PressableScaleProps } from '@/components';
import { muscleShortLabels, type Exercise } from '@/lib/exercises';
import { muscleSets, type RoutineListItem } from '@/lib/routines';
import { cn } from '@/lib/utils';
import { rankColors, shadows } from '@/theme';

import { useStartWorkout } from '../session/hooks/useStartWorkout';

interface RoutineCardProps extends Pick<
  PressableScaleProps,
  'accessibilityActions' | 'onAccessibilityAction'
> {
  routine: RoutineListItem;
  library: ReadonlyMap<string, Exercise>;
  onLongPress: () => void;
}

/** A saved routine: tap to edit, play to start. Its colour is a small mark only. */
export const RoutineCard = memo(function RoutineCard({
  routine,
  library,
  onLongPress,
  ...a11y
}: RoutineCardProps) {
  const router = useRouter();
  const start = useStartWorkout();
  const count = routine.exercises.length;
  const muscles = muscleSets(routine.exercises, (id) => library.get(id)).slice(0, 3);
  const meta = [
    `${count} ${count === 1 ? 'exercise' : 'exercises'}`,
    `${routine.setCount} ${routine.setCount === 1 ? 'set' : 'sets'}`,
    routine.estimatedDurationMin ? `~${routine.estimatedDurationMin} min` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const colour = routine.colour ? rankColors[routine.colour].base : undefined;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${routine.name}${routine.archived ? ', archived' : ''}. ${meta}`}
      accessibilityHint="Opens the routine. Long press for more actions."
      onPress={() => router.push({ pathname: '/routine/[id]', params: { id: routine.id } })}
      onLongPress={onLongPress}
      delayLongPress={400}
      {...a11y}
      className={cn(
        'flex-row items-center gap-md rounded-lg border-t border-edge bg-surface py-lg pl-lg pr-md',
        routine.archived && 'opacity-60',
      )}
      style={[shadows.sm, colour ? { borderLeftWidth: 2, borderLeftColor: colour } : null]}
    >
      <View className="flex-1 gap-xs">
        <View className="flex-row items-center gap-sm">
          {colour ? (
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colour }} />
          ) : null}
          <Text variant="subheading" numberOfLines={1} className="flex-shrink">
            {routine.name}
          </Text>
        </View>
        <Text variant="caption" tone="muted" numeric numberOfLines={1}>
          {meta}
        </Text>
        {muscles.length ? (
          <View className="flex-row flex-wrap gap-xs pt-xxs">
            {muscles.map((m) => (
              <Tag key={m.muscle} label={muscleShortLabels[m.muscle]} />
            ))}
          </View>
        ) : null}
      </View>
      <IconButton
        icon="play"
        variant="surface"
        accessibilityLabel={`Start ${routine.name}`}
        onPress={() => start({ kind: 'routine', routineId: routine.id })}
      />
    </PressableScale>
  );
});

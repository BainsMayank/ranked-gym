import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, IconButton, Tag, Text } from '@/components';
import type { Exercise } from '@/lib/exercises';
import { cn } from '@/lib/utils';

import { exerciseBadge, exerciseSummary } from '../summary';

export interface ExerciseRowProps {
  exercise: Exercise;
  /** Multi-select: shows a check circle and toggles instead of opening. */
  selectable?: boolean;
  selected?: boolean;
  /** Already in the routine or session: shown but not pickable. */
  added?: boolean;
  onPress: (exercise: Exercise) => void;
  /** Info button that opens the detail screen (picker mode). */
  onInfo?: (exercise: Exercise) => void;
}

/** One exercise in the library or picker: name, equipment and primary muscles. */
export const ExerciseRow = memo(function ExerciseRow({
  exercise,
  selectable = false,
  selected = false,
  added = false,
  onPress,
  onInfo,
}: ExerciseRowProps) {
  const badge = exerciseBadge(exercise);
  const summary = exerciseSummary(exercise);

  return (
    <View className="min-h-16 flex-row items-center gap-sm">
      <Pressable
        accessibilityRole={selectable ? 'checkbox' : 'button'}
        accessibilityLabel={`${exercise.name}, ${summary}${badge ? `, ${badge}` : ''}`}
        accessibilityState={
          selectable ? { checked: selected, disabled: added } : { disabled: added }
        }
        accessibilityHint={added ? 'Already added' : undefined}
        disabled={added}
        onPress={() => onPress(exercise)}
        className={cn(
          'flex-1 flex-row items-center gap-md py-sm active:opacity-70',
          added && 'opacity-50',
        )}
      >
        {selectable ? (
          <Icon
            name={selected || added ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            tone={selected ? 'primary' : 'textMuted'}
          />
        ) : null}
        <View className="flex-1 gap-xxs">
          <View className="flex-row items-center gap-sm">
            <Text variant="subheading" numberOfLines={1} className="flex-shrink">
              {exercise.name}
            </Text>
            {badge ? <Tag label={badge} tone={badge === 'Custom' ? 'neutral' : 'primary'} /> : null}
          </View>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {added ? `Added · ${summary}` : summary}
          </Text>
        </View>
      </Pressable>
      {onInfo ? (
        <IconButton
          icon="information-circle-outline"
          accessibilityLabel={`About ${exercise.name}`}
          size="sm"
          onPress={() => onInfo(exercise)}
        />
      ) : null}
    </View>
  );
});

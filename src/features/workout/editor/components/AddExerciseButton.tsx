import { Pressable } from 'react-native';

import { Icon, Text } from '@/components';

/** Dashed "add" row at the end of the exercise list (opens the multi-select picker). */
export function AddExerciseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add exercises"
      onPress={onPress}
      className="mb-xxl mt-sm min-h-12 flex-row items-center justify-center gap-sm rounded-lg border border-dashed border-border active:opacity-70"
    >
      <Icon name="add" size={18} tone="text" />
      <Text variant="subheading">Add exercises</Text>
    </Pressable>
  );
}

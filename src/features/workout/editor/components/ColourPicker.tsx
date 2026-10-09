import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components';
import { haptics } from '@/lib/haptics';
import { routineColours, type RoutineColour } from '@/lib/routines';
import { cn } from '@/lib/utils';
import { rankColors } from '@/theme';

const names: Record<RoutineColour, string> = {
  iron: 'Iron grey',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Ice',
  diamond: 'Blue',
  master: 'Violet',
  champion: 'Orange',
};

/** A routine's colour: one of the rank hues, used only as a small mark on its card. */
export function ColourPicker({
  value,
  onChange,
}: {
  value: RoutineColour | null;
  onChange: (colour: RoutineColour | null) => void;
}) {
  const options: (RoutineColour | null)[] = [null, ...routineColours];
  return (
    <View className="gap-sm">
      <Text variant="label" tone="muted">
        Colour
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Colour"
        className="flex-row flex-wrap"
      >
        {options.map((c) => {
          const selected = value === c;
          return (
            <Pressable
              key={c ?? 'none'}
              accessibilityRole="radio"
              accessibilityLabel={c ? names[c] : 'No colour'}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => {
                haptics.selection();
                onChange(c);
              }}
              hitSlop={2}
              className="h-10 w-10 items-center justify-center"
            >
              <View
                className={cn(
                  'h-8 w-8 items-center justify-center rounded-full border-2',
                  selected ? 'border-text' : 'border-transparent',
                )}
              >
                {c ? (
                  <View
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: rankColors[c].base }}
                  />
                ) : (
                  <Icon name="ban-outline" size={20} tone="textMuted" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

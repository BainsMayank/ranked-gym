import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { cn } from '@/lib/utils';

const DAYS = [
  { key: 0, short: 'M', name: 'Monday' },
  { key: 1, short: 'T', name: 'Tuesday' },
  { key: 2, short: 'W', name: 'Wednesday' },
  { key: 3, short: 'T', name: 'Thursday' },
  { key: 4, short: 'F', name: 'Friday' },
  { key: 5, short: 'S', name: 'Saturday' },
  { key: 6, short: 'S', name: 'Sunday' },
] as const;

interface DayPickerProps {
  selected: readonly number[];
  onToggle: (day: number) => void;
}

/** Seven day toggles (Mon → Sun). */
export function DayPicker({ selected, onToggle }: DayPickerProps) {
  return (
    <View className="flex-row gap-xs">
      {DAYS.map((d) => {
        const on = selected.includes(d.key);
        return (
          <Pressable
            key={d.key}
            accessibilityRole="checkbox"
            accessibilityLabel={d.name}
            accessibilityState={{ checked: on }}
            onPress={() => onToggle(d.key)}
            className={cn(
              'h-12 flex-1 items-center justify-center rounded-md',
              on ? 'bg-text' : 'border border-border',
            )}
          >
            <Text variant="subheading" tone={on ? 'inverse' : 'default'}>
              {d.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

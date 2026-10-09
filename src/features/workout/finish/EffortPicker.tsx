import { View } from 'react-native';

import { PressableScale, Text } from '@/components';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { effortWord } from '@/lib/workouts';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** How hard the session felt, 1–10 (tap again to clear). */
export function EffortPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <View className="gap-sm">
      <View className="flex-row items-baseline justify-between">
        <Text variant="subheading">How hard was it?</Text>
        <Text variant="label" tone="muted">
          {value === null ? 'Optional' : `${value} · ${effortWord(value)}`}
        </Text>
      </View>
      <View
        className="flex-row gap-xxs"
        accessibilityRole="adjustable"
        accessibilityLabel="Effort"
        accessibilityValue={{
          min: 1,
          max: 10,
          now: value ?? undefined,
          text: value ? effortWord(value) : 'Not set',
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const next = (value ?? 5) + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
          onChange(Math.min(10, Math.max(1, next)));
        }}
      >
        {LEVELS.map((n) => (
          <PressableScale
            key={n}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            onPress={() => {
              haptics.selection();
              onChange(value === n ? null : n);
            }}
            className={cn(
              'h-11 flex-1 items-center justify-center rounded-sm',
              value === n ? 'bg-text' : 'bg-surface-raised',
            )}
          >
            <Text
              variant="label"
              tone={value === n ? 'inverse' : 'default'}
              numeric
              maxFontSizeMultiplier={1.3}
            >
              {n}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

import { View } from 'react-native';

import { useTheme } from '@/theme';

/** Thin segmented progress for multi-step flows. */
export function StepProgress({ step, total }: { step: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
      className="flex-row gap-xs"
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className="h-1 flex-1 rounded-full"
          style={{ backgroundColor: i < step ? colors.primary : colors.surfaceRaised }}
        />
      ))}
    </View>
  );
}

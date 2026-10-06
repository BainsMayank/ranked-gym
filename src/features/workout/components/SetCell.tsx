import { TextInput } from 'react-native';

import { cn } from '@/lib/utils';
import { fontFamilies, useTheme } from '@/theme';

interface SetCellProps {
  value: string;
  accessibilityLabel: string;
  className?: string;
}

/** One editable number in a set row (kg, reps, RIR/RPE). */
export function SetCell({ value, accessibilityLabel, className }: SetCellProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      defaultValue={value}
      accessibilityLabel={accessibilityLabel}
      keyboardType="decimal-pad"
      selectTextOnFocus
      selectionColor={colors.primary}
      className={cn('h-9 rounded-sm bg-surface-raised px-sm text-text', className)}
      // No lineHeight: iOS offsets single-line TextInput text when one is set.
      style={{
        fontFamily: fontFamilies.medium,
        fontSize: 15,
        paddingVertical: 0,
        fontVariant: ['tabular-nums'],
      }}
    />
  );
}

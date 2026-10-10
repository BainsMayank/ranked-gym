import { View } from 'react-native';

import { cn } from '@/lib/utils';

import { Text } from './Text';
import { PressableScale } from './PressableScale';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Describes the group, e.g. "Time range". */
  accessibilityLabel: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn('flex-row rounded-md bg-surface-raised p-xxs', className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <PressableScale
            key={opt.value}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(opt.value)}
            className={cn(
              'min-h-12 flex-1 items-center justify-center rounded-md px-sm',
              selected ? 'bg-text' : 'active:opacity-70',
            )}
          >
            <Text variant="label" tone={selected ? 'inverse' : 'muted'}>
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

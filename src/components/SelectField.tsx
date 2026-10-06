import { View } from 'react-native';

import { cn } from '@/lib/utils';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SelectFieldProps {
  value: string;
  /** Small label above the value. Omit for compact filter selects. */
  label?: string;
  onPress: () => void;
  className?: string;
}

/** Looks like a dropdown: shows the current choice and opens a picker (usually a Sheet) on press. */
export function SelectField({ value, label, onPress, className }: SelectFieldProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label ? `${label}: ${value}` : value}
      accessibilityHint="Opens options"
      onPress={onPress}
      containerStyle={{ flex: 1 }}
      className={cn('min-h-12 justify-center rounded-md bg-surface px-md py-sm', className)}
    >
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      <View className="flex-row items-center justify-between gap-xs">
        <Text variant={label ? 'subheading' : 'label'} numberOfLines={1} className="flex-shrink">
          {value}
        </Text>
        <Icon name="chevron-down" size={16} tone="textMuted" />
      </View>
    </PressableScale>
  );
}

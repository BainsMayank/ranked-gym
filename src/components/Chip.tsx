import { Pressable } from 'react-native';

import { cn } from '@/lib/utils';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  accessibilityLabel?: string;
  className?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled,
  accessibilityLabel,
  className,
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={4}
      className={cn(
        'min-h-8 flex-row items-center gap-xs self-start rounded-full border px-md active:opacity-70',
        selected ? 'border-primary bg-primary/15' : 'border-border bg-surface',
        disabled && 'opacity-50',
        className,
      )}
    >
      {icon ? <Icon name={icon} size={14} tone={selected ? 'primary' : 'textMuted'} /> : null}
      <Text variant="label" tone={selected ? 'primary' : 'default'}>
        {label}
      </Text>
    </Pressable>
  );
}

import { Icon, PressableScale, Text, type IconName } from '@/components';
import { cn } from '@/lib/utils';

interface KeypadKeyProps {
  label?: string;
  icon?: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  /** Side column keys fill the column; digit keys take a third of the pad. */
  wide?: boolean;
  disabled?: boolean;
}

/** One keypad key: 56pt tall, big type, spring press. */
export function KeypadKey({
  label,
  icon,
  accessibilityLabel,
  onPress,
  wide,
  disabled,
}: KeypadKeyProps) {
  return (
    <PressableScale
      accessibilityRole="keyboardkey"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      containerStyle={wide ? undefined : { width: '31%', flexGrow: 1 }}
      className={cn(
        'h-14 items-center justify-center rounded-md',
        'bg-surface-raised',
        disabled && 'opacity-40',
      )}
    >
      {icon ? (
        <Icon name={icon} size={22} tone="text" />
      ) : (
        <Text variant="heading" numeric maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      )}
    </PressableScale>
  );
}

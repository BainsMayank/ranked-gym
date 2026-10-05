import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { cn } from '@/lib/utils';
import { useTheme, type ColorToken } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text, type TextTone } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  className?: string;
}

const containerClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface-raised border border-border',
  ghost: 'bg-transparent',
  destructive: 'bg-danger',
};

const contentTone: Record<ButtonVariant, { text: TextTone; token: ColorToken }> = {
  primary: { text: 'onPrimary', token: 'onPrimary' },
  secondary: { text: 'default', token: 'text' },
  ghost: { text: 'primary', token: 'primary' },
  destructive: { text: 'onDanger', token: 'onDanger' },
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-md',
  md: 'min-h-12 px-lg',
  lg: 'min-h-14 px-xl',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  fullWidth,
  className,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const tone = contentTone[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 6 : 0}
      className={cn(
        'flex-row items-center justify-center rounded-md active:opacity-80',
        containerClass[variant],
        sizeClass[size],
        fullWidth && 'self-stretch',
        isDisabled && !loading && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors[tone.token]} testID="button-spinner" />
      ) : (
        <View className="flex-row items-center gap-sm">
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 20} tone={tone.token} /> : null}
          <Text variant={size === 'sm' ? 'label' : 'subheading'} tone={tone.text}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

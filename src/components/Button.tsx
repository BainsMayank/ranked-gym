import { ActivityIndicator, View, type PressableProps } from 'react-native';

import { cn } from '@/lib/utils';
import { useTheme, type ColorToken } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text, type TextTone } from './Text';

/**
 * `primary` is the inverted (white on dark, black on light) main action: one per screen.
 * `accent` is the orange fill, reserved for game moments (claim reward, join challenge).
 */
export type ButtonVariant =
  'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'destructive';
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
  primary: 'bg-text',
  accent: 'bg-primary',
  secondary: 'bg-surface-raised',
  outline: 'border border-border bg-transparent',
  ghost: 'bg-transparent',
  destructive: 'bg-danger',
};

const contentTone: Record<ButtonVariant, { text: TextTone; token: ColorToken }> = {
  primary: { text: 'inverse', token: 'background' },
  accent: { text: 'onPrimary', token: 'onPrimary' },
  secondary: { text: 'default', token: 'text' },
  outline: { text: 'default', token: 'text' },
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
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 6 : 0}
      containerStyle={fullWidth ? { alignSelf: 'stretch' } : undefined}
      className={cn(
        'flex-row items-center justify-center rounded-md',
        containerClass[variant],
        sizeClass[size],
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
          <Text
            variant={size === 'sm' ? 'label' : 'subheading'}
            tone={tone.text}
            maxFontSizeMultiplier={1.4}
          >
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

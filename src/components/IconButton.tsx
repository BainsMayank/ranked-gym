import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/utils';
import type { ColorToken } from '@/theme';

import { Icon, type IconName } from './Icon';

export type IconButtonVariant = 'ghost' | 'surface' | 'primary';

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  icon: IconName;
  /** Required: icon-only controls have no visible text for screen readers. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClass: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent',
  surface: 'bg-surface-raised',
  primary: 'bg-primary',
};

const iconTone: Record<IconButtonVariant, ColorToken> = {
  ghost: 'text',
  surface: 'text',
  primary: 'onPrimary',
};

const sizes = {
  sm: { box: 'h-9 w-9', icon: 18 },
  md: { box: 'h-11 w-11', icon: 22 },
  lg: { box: 'h-14 w-14', icon: 26 },
};

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  disabled,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      className={cn(
        'items-center justify-center rounded-full active:opacity-70',
        variantClass[variant],
        sizes[size].box,
        disabled && 'opacity-50',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={sizes[size].icon} tone={iconTone[variant]} />
    </Pressable>
  );
}

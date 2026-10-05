import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/utils';
import type { TypeVariant } from '@/theme';

export type TextTone =
  'default' | 'muted' | 'primary' | 'onPrimary' | 'success' | 'warning' | 'danger' | 'onDanger';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  className?: string;
}

const variantClass: Record<TypeVariant, string> = {
  display: 'text-display',
  title: 'text-title',
  heading: 'text-heading',
  subheading: 'text-subheading',
  body: 'text-body',
  label: 'text-label',
  caption: 'text-caption',
};

const toneClass: Record<TextTone, string> = {
  default: 'text-text',
  muted: 'text-text-muted',
  primary: 'text-primary',
  onPrimary: 'text-on-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  onDanger: 'text-on-danger',
};

export function Text({ variant = 'body', tone = 'default', className, ...rest }: TextProps) {
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <RNText
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={1.6}
      className={cn(variantClass[variant], toneClass[tone], className)}
      {...rest}
    />
  );
}

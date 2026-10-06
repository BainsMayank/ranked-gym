import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/utils';
import { fontFamilies, typography, type TypeVariant } from '@/theme';

export type TextTone =
  | 'default'
  | 'muted'
  | 'inverse'
  | 'primary'
  | 'onPrimary'
  | 'success'
  | 'warning'
  | 'streak'
  | 'danger'
  | 'onDanger';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  /** Tabular figures, so weights, reps and points don't shift width as they change. */
  numeric?: boolean;
  className?: string;
}

const variantClass: Record<TypeVariant, string> = {
  hero: 'text-hero',
  display: 'text-display',
  title: 'text-title',
  heading: 'text-heading',
  subheading: 'text-subheading',
  body: 'text-body',
  label: 'text-label',
  caption: 'text-caption',
  overline: 'text-overline',
};

const toneClass: Record<TextTone, string> = {
  default: 'text-text',
  muted: 'text-text-muted',
  inverse: 'text-background',
  primary: 'text-primary',
  onPrimary: 'text-on-primary',
  success: 'text-success',
  warning: 'text-warning',
  streak: 'text-streak',
  danger: 'text-danger',
  onDanger: 'text-on-danger',
};

const HEADINGS: readonly TypeVariant[] = ['hero', 'display', 'title', 'heading'];

export function Text({
  variant = 'body',
  tone = 'default',
  numeric = false,
  className,
  style,
  ...rest
}: TextProps) {
  const t = typography[variant];
  return (
    <RNText
      accessibilityRole={HEADINGS.includes(variant) ? 'header' : undefined}
      // Large display sizes are bounded so they can't break layouts; body text scales further.
      maxFontSizeMultiplier={t.fontSize >= 28 ? 1.3 : 1.6}
      className={cn(variantClass[variant], toneClass[tone], t.uppercase && 'uppercase', className)}
      style={[
        { fontFamily: fontFamilies[t.weight], includeFontPadding: false },
        numeric && { fontVariant: ['tabular-nums'] },
        style,
      ]}
      {...rest}
    />
  );
}

import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/utils';
import { useTheme } from '@/theme';

import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  helperText?: string;
  error?: string;
  className?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, helperText, error, className, onFocus, onBlur, editable = true, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const message = error ?? helperText;

  return (
    <View className={cn('gap-xs', className)}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={message}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className={cn(
          'min-h-12 rounded-md border bg-surface px-md text-body text-text',
          error ? 'border-danger' : focused ? 'border-primary' : 'border-border',
          !editable && 'opacity-50',
        )}
        {...rest}
      />
      {message ? (
        <Text variant="caption" tone={error ? 'danger' : 'muted'}>
          {message}
        </Text>
      ) : null}
    </View>
  );
});

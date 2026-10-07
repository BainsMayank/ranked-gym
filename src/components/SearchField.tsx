import { forwardRef } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/utils';
import { useTheme } from '@/theme';

import { Icon } from './Icon';

export interface SearchFieldProps extends Omit<
  TextInputProps,
  'style' | 'value' | 'onChangeText' | 'placeholder'
> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  className?: string;
}

/** Search box with a clear button. Unlike `Input` it has no visible label (the placeholder says it). */
export const SearchField = forwardRef<TextInput, SearchFieldProps>(function SearchField(
  { value, onChangeText, placeholder, accessibilityLabel, className, ...rest },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View
      className={cn('min-h-12 flex-row items-center gap-sm rounded-md bg-surface px-md', className)}
    >
      <Icon name="search" size={18} tone="textMuted" />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        className="flex-1 py-sm text-body text-text"
        {...rest}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          hitSlop={12}
          className="active:opacity-60"
        >
          <Icon name="close-circle" size={18} tone="textMuted" />
        </Pressable>
      ) : null}
    </View>
  );
});

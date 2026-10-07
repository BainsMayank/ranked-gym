import { forwardRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Text } from '@/components';
import { cn } from '@/lib/utils';
import { useTheme } from '@/theme';

interface CodeInputProps {
  length: number;
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
  editable?: boolean;
}

/**
 * One digit per box. A single transparent TextInput sits on top, so paste, iOS code autofill and
 * screen readers all work on a normal field.
 */
export const CodeInput = forwardRef<TextInput, CodeInputProps>(function CodeInput(
  { length, value, onChange, error = false, editable = true },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View className="relative">
      <View className="flex-row gap-sm" importantForAccessibility="no-hide-descendants">
        {Array.from({ length }, (_, i) => {
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              className={cn(
                'h-14 flex-1 items-center justify-center rounded-md border bg-surface',
                error ? 'border-danger' : active ? 'border-primary' : 'border-border',
              )}
            >
              <Text variant="title" numeric>
                {value[i] ?? ''}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        accessibilityLabel={`Sign-in code, ${length} digits`}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus
        caretHidden
        selectionColor="transparent"
        style={{ position: 'absolute', inset: 0, color: 'transparent', opacity: 0.02 }}
        cursorColor={colors.primary}
      />
    </View>
  );
});

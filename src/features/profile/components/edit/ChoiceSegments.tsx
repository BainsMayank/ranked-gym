import { View } from 'react-native';

import { Chip, Text } from '@/components';

interface ChoiceSegmentsProps<T extends string> {
  label: string;
  options: readonly { id: T; title: string; subtitle?: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  /** Muted line under the chips; defaults to the selected option's subtitle. */
  hint?: string;
}

/** A compact single-choice row of chips for forms with many fields. */
export function ChoiceSegments<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
}: ChoiceSegmentsProps<T>) {
  const selected = options.find((o) => o.id === value);
  return (
    <View className="gap-xs">
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        className="flex-row flex-wrap gap-xs"
      >
        {options.map((o) => (
          <Chip
            key={o.id}
            label={o.title}
            selected={o.id === value}
            onPress={() => onChange(o.id)}
          />
        ))}
      </View>
      {(hint ?? selected?.subtitle) ? (
        <Text variant="caption" tone="muted">
          {hint ?? selected?.subtitle}
        </Text>
      ) : null}
    </View>
  );
}

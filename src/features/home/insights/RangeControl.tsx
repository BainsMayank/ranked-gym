import { View } from 'react-native';

import { Chip, Input, Text } from '@/components';
import { validDate } from '@/lib/insights';

export function RangeControl({
  value,
  onChange,
  options,
  custom,
  onCustom,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  custom?: { start: string; end: string };
  onCustom?: (value: { start: string; end: string }) => void;
}) {
  return (
    <View className="gap-sm">
      <View className="flex-row flex-wrap gap-sm">
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={value === o.value}
            onPress={() => onChange(o.value)}
          />
        ))}
      </View>
      {value === 'custom' && custom && onCustom ? (
        <View className="gap-sm">
          <Input
            label="From (YYYY-MM-DD)"
            value={custom.start}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            onChangeText={(start) => onCustom({ ...custom, start })}
          />
          <Input
            label="Through (YYYY-MM-DD)"
            value={custom.end}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            onChangeText={(end) => onCustom({ ...custom, end })}
          />
          {!validDate(custom.start) || !validDate(custom.end) || custom.start > custom.end ? (
            <Text variant="caption" tone="danger">
              Enter valid dates, with the end on or after the start.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

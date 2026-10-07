import { Pressable, ScrollView, View } from 'react-native';

import { Button, Chip, Sheet, Text } from '@/components';

export interface FilterSection<T extends string> {
  title?: string;
  options: readonly { value: T; label: string }[];
}

export interface FilterSheetProps<T extends string> {
  visible: boolean;
  onClose: () => void;
  title: string;
  sections: readonly FilterSection<T>[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
}

/** Multi-select chips in a bottom sheet. A section title toggles its whole section. */
export function FilterSheet<T extends string>({
  visible,
  onClose,
  title,
  sections,
  selected,
  onChange,
}: FilterSheetProps<T>) {
  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const toggleSection = (section: FilterSection<T>) => {
    const values = section.options.map((o) => o.value);
    const all = values.every((v) => selected.includes(v));
    onChange(
      all ? selected.filter((v) => !values.includes(v)) : [...new Set([...selected, ...values])],
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 420 }} contentContainerClassName="gap-lg pb-md">
        {sections.map((section, i) => (
          <View key={section.title ?? i} className="gap-sm">
            {section.title ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select all ${section.title}`}
                onPress={() => toggleSection(section)}
                hitSlop={8}
                className="self-start active:opacity-60"
              >
                <Text variant="overline" tone="muted">
                  {section.title}
                </Text>
              </Pressable>
            ) : null}
            <View className="flex-row flex-wrap gap-sm">
              {section.options.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={selected.includes(option.value)}
                  onPress={() => toggle(option.value)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <View className="flex-row gap-sm pt-md">
        <Button
          label="Clear"
          variant="secondary"
          onPress={() => onChange([])}
          disabled={selected.length === 0}
          className="flex-1"
        />
        <Button label="Done" onPress={onClose} className="flex-1" />
      </View>
    </Sheet>
  );
}

import { View } from 'react-native';

import { OptionCard } from '@/components';

interface Choice<T extends string> {
  id: T;
  title: string;
  subtitle?: string;
}

interface ChoiceListProps<T extends string> {
  label: string;
  options: readonly Choice<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  /** Two-column tiles for short options; full-width rows (default) for descriptions. */
  grid?: boolean;
}

/** A radio group of option cards. */
export function ChoiceList<T extends string>({
  label,
  options,
  value,
  onChange,
  grid = false,
}: ChoiceListProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className={grid ? 'flex-row flex-wrap gap-sm' : 'gap-sm'}
    >
      {options.map((o) => (
        <OptionCard
          key={o.id}
          title={o.title}
          subtitle={o.subtitle}
          selected={o.id === value}
          onPress={() => onChange(o.id)}
          wide={!grid}
        />
      ))}
    </View>
  );
}

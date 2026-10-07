import { useState } from 'react';
import { ScrollView } from 'react-native';

import { Chip } from '@/components';
import { NO_FILTERS, type ExerciseFilters } from '@/lib/exercises';

import { categorySections, equipmentSections, muscleSections } from '../filterOptions';
import { FilterSheet } from './FilterSheet';

export interface ExerciseFilterBarProps {
  filters: ExerciseFilters;
  onChange: (filters: ExerciseFilters) => void;
}

type SheetKey = 'muscles' | 'equipment' | 'categories';

const label = (name: string, count: number) => (count > 0 ? `${name} · ${count}` : name);

/** Muscle, equipment and category filters as chips; each opens a sheet. */
export function ExerciseFilterBar({ filters, onChange }: ExerciseFilterBarProps) {
  const [open, setOpen] = useState<SheetKey | null>(null);
  const close = () => setOpen(null);
  const active = filters.muscles.length + filters.equipment.length + filters.categories.length > 0;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-lg flex-shrink-0 flex-grow-0"
        contentContainerStyle={{ paddingVertical: 2 }}
        contentContainerClassName="gap-sm px-lg"
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label={label('Muscle', filters.muscles.length)}
          icon="body-outline"
          selected={filters.muscles.length > 0}
          onPress={() => setOpen('muscles')}
        />
        <Chip
          label={label('Equipment', filters.equipment.length)}
          icon="barbell-outline"
          selected={filters.equipment.length > 0}
          onPress={() => setOpen('equipment')}
        />
        <Chip
          label={label('Type', filters.categories.length)}
          icon="grid-outline"
          selected={filters.categories.length > 0}
          onPress={() => setOpen('categories')}
        />
        {active ? (
          <Chip
            label="Clear"
            icon="close"
            accessibilityLabel="Clear all filters"
            onPress={() => onChange(NO_FILTERS)}
          />
        ) : null}
      </ScrollView>

      <FilterSheet
        visible={open === 'muscles'}
        onClose={close}
        title="Muscles"
        sections={muscleSections}
        selected={filters.muscles}
        onChange={(muscles) => onChange({ ...filters, muscles })}
      />
      <FilterSheet
        visible={open === 'equipment'}
        onClose={close}
        title="Equipment"
        sections={equipmentSections}
        selected={filters.equipment}
        onChange={(equipment) => onChange({ ...filters, equipment })}
      />
      <FilterSheet
        visible={open === 'categories'}
        onClose={close}
        title="Type"
        sections={categorySections}
        selected={filters.categories}
        onChange={(categories) => onChange({ ...filters, categories })}
      />
    </>
  );
}

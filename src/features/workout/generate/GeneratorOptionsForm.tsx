import { View } from 'react-native';

import { Chip, SegmentedControl, Text } from '@/components';
import {
  equipmentLabels,
  equipmentTypes,
  muscleRegions,
  regionLabels,
  type Equipment,
  type MuscleRegion,
} from '@/lib/exercises';
import {
  intensities,
  intensityLabels,
  sessionLengths,
  type GeneratorOptions,
  type SessionLength,
} from '@/lib/workouts';

const lengthOptions = sessionLengths.map((m) => ({ value: String(m), label: `${m}` }));
const intensityOptions = intensities.map((i) => ({ value: i, label: intensityLabels[i] }));
/** Bodyweight is always allowed, so it isn't a choice. */
const equipmentChoices = equipmentTypes.filter((e) => e !== 'bodyweight' && e !== 'other');

interface Props {
  options: GeneratorOptions;
  onChange: (patch: Partial<GeneratorOptions>) => void;
}

/** Focus, time, equipment and intensity. Every change redraws the preview below. */
export function GeneratorOptionsForm({ options, onChange }: Props) {
  const regions = options.focus.kind === 'regions' ? options.focus.regions : [];
  const toggleRegion = (r: MuscleRegion) => {
    const next = regions.includes(r) ? regions.filter((x) => x !== r) : [...regions, r];
    onChange({ focus: next.length ? { kind: 'regions', regions: next } : { kind: 'surprise' } });
  };
  const toggleEquipment = (e: Equipment) => {
    const has = options.equipment.includes(e);
    onChange({
      equipment: has ? options.equipment.filter((x) => x !== e) : [...options.equipment, e],
    });
  };

  return (
    <View className="gap-lg">
      <View className="gap-sm">
        <Text variant="label" tone="muted">
          Focus
        </Text>
        <View className="flex-row flex-wrap gap-sm">
          <Chip
            label="Surprise me"
            icon="sparkles-outline"
            selected={options.focus.kind === 'surprise'}
            onPress={() => onChange({ focus: { kind: 'surprise' } })}
          />
          {muscleRegions.map((r) => (
            <Chip
              key={r}
              label={regionLabels[r]}
              selected={regions.includes(r)}
              onPress={() => toggleRegion(r)}
            />
          ))}
        </View>
      </View>
      <View className="gap-sm">
        <Text variant="label" tone="muted">
          Minutes available
        </Text>
        <SegmentedControl
          options={lengthOptions}
          value={String(options.minutes)}
          onChange={(v) => onChange({ minutes: Number(v) as SessionLength })}
          accessibilityLabel="Minutes available"
        />
      </View>
      <View className="gap-sm">
        <Text variant="label" tone="muted">
          Equipment you have
        </Text>
        <View className="flex-row flex-wrap gap-sm">
          {equipmentChoices.map((e) => (
            <Chip
              key={e}
              label={equipmentLabels[e]}
              selected={options.equipment.includes(e)}
              onPress={() => toggleEquipment(e)}
            />
          ))}
        </View>
        <Text variant="caption" tone="muted">
          Bodyweight moves are always included.
        </Text>
      </View>
      <View className="gap-sm">
        <Text variant="label" tone="muted">
          Intensity
        </Text>
        <SegmentedControl
          options={intensityOptions}
          value={options.intensity}
          onChange={(intensity) => onChange({ intensity })}
          accessibilityLabel="Intensity"
        />
      </View>
    </View>
  );
}

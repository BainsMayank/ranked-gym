import { View } from 'react-native';

import { Chip, OptionCard, Text } from '@/components';
import { equipmentLabels, type Equipment } from '@/lib/exercises';
import { equipmentPresetLabels, equipmentPresets, type EquipmentPreset } from '@/lib/plans';

import { usePlanDraft } from '../../draft';
import { QuestionFrame } from '../QuestionFrame';
import { ToggleRow } from '../ToggleRow';

const PRESET_NOTES: Record<EquipmentPreset, string> = {
  gym: 'Barbells, dumbbells, machines, cables',
  dumbbells: 'A pair of adjustable dumbbells',
  bodyweight: 'Nothing but you (and a bar, if you have one)',
  custom: 'Pick exactly what you have',
};

const CUSTOM: Equipment[] = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'smith',
  'band',
];

export function EquipmentStep({ onNext }: { onNext: () => void }) {
  const equipment = usePlanDraft((s) => s.input.equipment);
  const update = usePlanDraft((s) => s.update);
  const set = (patch: Partial<typeof equipment>) =>
    update({ equipment: { ...equipment, ...patch } });
  const toggle = (e: Equipment) =>
    set({
      custom: equipment.custom.includes(e)
        ? equipment.custom.filter((x) => x !== e)
        : [...equipment.custom, e],
    });

  return (
    <QuestionFrame
      title="What can you train with?"
      subtitle="Every exercise in your plan will use only this."
      onContinue={onNext}
    >
      <View className="gap-sm">
        {equipmentPresets.map((p) => (
          <OptionCard
            key={p}
            wide
            title={equipmentPresetLabels[p]}
            subtitle={PRESET_NOTES[p]}
            selected={equipment.preset === p}
            onPress={() => set({ preset: p })}
          />
        ))}
      </View>
      {equipment.preset === 'custom' ? (
        <View className="gap-sm">
          <Text variant="label" tone="muted">
            Your equipment (bodyweight is always included)
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {CUSTOM.map((e) => (
              <Chip
                key={e}
                label={equipmentLabels[e]}
                selected={equipment.custom.includes(e)}
                onPress={() => toggle(e)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {equipment.preset !== 'gym' ? (
        <ToggleRow
          title="Pull-up or dip bars"
          subtitle="A doorway bar, a park or parallel bars. Opens up pull-ups, dips and hanging core work."
          value={equipment.bars}
          onChange={(bars) => set({ bars })}
        />
      ) : null}
    </QuestionFrame>
  );
}

import { View } from 'react-native';

import { Button, Chip, Input, OptionCard, Screen, SectionHeader, Text } from '@/components';
import { equipmentLabels, equipmentTypes, logTypeLabels, logTypes } from '@/lib/exercises';

import type { CustomExerciseValues } from '../customExerciseForm';
import { useCustomExerciseForm } from '../hooks/useCustomExerciseForm';
import { MuscleSelector } from './MuscleSelector';

export interface CustomExerciseFormProps {
  title: string;
  editingId?: string;
  initial: CustomExerciseValues;
  onClose: () => void;
}

/** Name, equipment, how it's logged, and the muscles it trains. */
export function CustomExerciseForm({
  title,
  editingId,
  initial,
  onClose,
}: CustomExerciseFormProps) {
  const form = useCustomExerciseForm(initial, editingId, onClose);
  const { values, errors } = form;

  return (
    <Screen
      title={title}
      onBack={onClose}
      edges={['top', 'bottom']}
      scroll
      avoidKeyboard
      footer={
        <View className="gap-sm">
          {form.footerError ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {form.footerError}
            </Text>
          ) : null}
          <Button
            label={editingId ? 'Save changes' : 'Create exercise'}
            loading={form.saving}
            fullWidth
            onPress={form.submit}
          />
        </View>
      }
    >
      <View className="gap-xl">
        <Input
          label="Name"
          placeholder="e.g. Hostel bucket carry"
          maxLength={60}
          value={values.name}
          onChangeText={form.setName}
          onBlur={form.blurName}
          error={errors.name}
          autoFocus={!editingId && !values.name}
        />

        <View className="gap-md">
          <SectionHeader title="Equipment" />
          <View className="flex-row flex-wrap gap-sm">
            {equipmentTypes.map((e) => (
              <Chip
                key={e}
                label={equipmentLabels[e]}
                selected={values.equipment === e}
                onPress={() => form.setEquipment(e)}
              />
            ))}
          </View>
          {errors.equipment ? (
            <Text variant="caption" tone="danger">
              {errors.equipment}
            </Text>
          ) : null}
        </View>

        <View className="gap-md">
          <SectionHeader title="How you log it" />
          <View className="gap-sm">
            {logTypes.map((t) => (
              <OptionCard
                key={t}
                wide
                title={logTypeLabels[t].label}
                subtitle={logTypeLabels[t].description}
                selected={values.logType === t}
                onPress={() => form.setLogType(t)}
              />
            ))}
          </View>
        </View>

        <MuscleSelector
          label="Primary muscles"
          selected={values.primary}
          onChange={form.setPrimary}
          error={errors.primary}
        />
        <MuscleSelector
          label="Secondary muscles (optional)"
          selected={values.secondary}
          unavailable={values.primary}
          onChange={form.setSecondary}
          error={errors.secondary}
        />
      </View>
    </Screen>
  );
}

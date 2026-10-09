import { View } from 'react-native';

import { Button, Chip, Text } from '@/components';
import { useExercisePicker, useExercises } from '@/lib/exercises';
import { groupLabels, volumeGroups, type VolumeGroup } from '@/lib/plans';

import { usePlanDraft } from '../../draft';
import { QuestionFrame } from '../QuestionFrame';

const MAX_PRIORITIES = 3;

export function FocusStep({ onNext }: { onNext: () => void }) {
  const priorities = usePlanDraft((s) => s.input.priorities);
  const avoid = usePlanDraft((s) => s.input.avoid);
  const update = usePlanDraft((s) => s.update);
  const pick = useExercisePicker();
  const { data: library } = useExercises();
  const names = new Map((library ?? []).map((e) => [e.id, e.name]));
  const full = priorities.length >= MAX_PRIORITIES;

  const toggle = (g: VolumeGroup) =>
    update({
      priorities: priorities.includes(g)
        ? priorities.filter((x) => x !== g)
        : full
          ? priorities
          : [...priorities, g],
    });
  const addAvoid = async () => {
    const picked = await pick({ multiple: true, exclude: avoid });
    if (picked.length) update({ avoid: [...new Set([...avoid, ...picked.map((e) => e.id)])] });
  };

  return (
    <QuestionFrame
      title="Anything to focus on or skip?"
      subtitle="Both are optional."
      onContinue={onNext}
      onSkip={() => {
        update({ priorities: [], avoid: [] });
        onNext();
      }}
    >
      <View className="gap-sm">
        <Text variant="subheading">Priority muscles</Text>
        <Text variant="caption" tone="muted">
          Up to {MAX_PRIORITIES}. They get the top of your weekly set range.
        </Text>
        <View className="flex-row flex-wrap gap-sm">
          {volumeGroups.map((g) => (
            <Chip
              key={g}
              label={groupLabels[g]}
              selected={priorities.includes(g)}
              disabled={full && !priorities.includes(g)}
              onPress={() => toggle(g)}
            />
          ))}
        </View>
      </View>
      <View className="gap-sm">
        <Text variant="subheading">Exercises to leave out</Text>
        <Text variant="caption" tone="muted">
          Anything that doesn&apos;t feel right for you. We&apos;ll pick another way to train it.
        </Text>
        {avoid.length ? (
          <View className="flex-row flex-wrap gap-sm">
            {avoid.map((id) => (
              <Chip
                key={id}
                label={names.get(id) ?? 'Exercise'}
                icon="close"
                accessibilityLabel={`Stop leaving out ${names.get(id) ?? 'this exercise'}`}
                onPress={() => update({ avoid: avoid.filter((x) => x !== id) })}
              />
            ))}
          </View>
        ) : null}
        <Button
          label="Choose exercises"
          icon="add"
          variant="outline"
          onPress={() => void addAvoid()}
        />
      </View>
    </QuestionFrame>
  );
}

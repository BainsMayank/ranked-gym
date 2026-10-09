import { View } from 'react-native';

import { OptionCard } from '@/components';
import { experienceOptions } from '@/lib/profile';

import { usePlanDraft } from '../../draft';
import { QuestionFrame } from '../QuestionFrame';

export function LevelStep({ onNext }: { onNext: () => void }) {
  const level = usePlanDraft((s) => s.input.level);
  const update = usePlanDraft((s) => s.update);
  return (
    <QuestionFrame
      title="How long have you been training?"
      subtitle="Beginners add weight every session; experienced lifters need more sets and smarter progression."
      onContinue={onNext}
    >
      <View className="gap-sm">
        {experienceOptions.map((o) => (
          <OptionCard
            key={o.id}
            wide
            title={o.title}
            subtitle={o.subtitle}
            selected={o.id === level}
            onPress={() => update({ level: o.id })}
          />
        ))}
      </View>
    </QuestionFrame>
  );
}

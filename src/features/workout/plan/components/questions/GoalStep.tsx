import { View } from 'react-native';

import { OptionCard } from '@/components';
import { goalOptions } from '@/lib/profile';

import { usePlanDraft } from '../../draft';
import { QuestionFrame } from '../QuestionFrame';

export function GoalStep({ onNext }: { onNext: () => void }) {
  const goal = usePlanDraft((s) => s.input.goal);
  const update = usePlanDraft((s) => s.update);
  return (
    <QuestionFrame
      title="What do you want to achieve?"
      subtitle="This sets your rep ranges, rest and how volume is spread."
      onContinue={onNext}
    >
      <View className="flex-row flex-wrap gap-sm">
        {goalOptions.map((g) => (
          <OptionCard
            key={g.id}
            title={g.title}
            subtitle={g.subtitle}
            selected={g.id === goal}
            onPress={() => update({ goal: g.id })}
          />
        ))}
      </View>
    </QuestionFrame>
  );
}

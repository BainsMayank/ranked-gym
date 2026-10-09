import { View } from 'react-native';

import { OptionCard } from '@/components';
import { planLengths, type PlanLength } from '@/lib/plans';

import { usePlanDraft } from '../../draft';
import { QuestionFrame } from '../QuestionFrame';

const NOTES: Record<PlanLength, string> = {
  4: 'A short block to build the habit. No deload.',
  6: 'Five weeks of progress, then a lighter deload week.',
  8: 'Seven weeks of progress, then a deload week. Best for real gains.',
};

export function WeeksStep({ onNext }: { onNext: () => void }) {
  const weeks = usePlanDraft((s) => s.input.weeks);
  const update = usePlanDraft((s) => s.update);
  return (
    <QuestionFrame
      title="How long should the plan run?"
      onContinue={onNext}
      continueLabel="Generate my plan"
    >
      <View className="gap-sm">
        {planLengths.map((w) => (
          <OptionCard
            key={w}
            wide
            title={`${w} weeks`}
            subtitle={NOTES[w]}
            selected={w === weeks}
            onPress={() => update({ weeks: w })}
          />
        ))}
      </View>
    </QuestionFrame>
  );
}

import { View } from 'react-native';

import { Chip } from '@/components';
import { sessionMinutes } from '@/lib/plans';

import { usePlanDraft } from '../../draft';
import { QuestionFrame } from '../QuestionFrame';
import { ToggleRow } from '../ToggleRow';

export function LengthStep({ onNext }: { onNext: () => void }) {
  const minutes = usePlanDraft((s) => s.input.minutes);
  const cardio = usePlanDraft((s) => s.input.cardio);
  const goal = usePlanDraft((s) => s.input.goal);
  const update = usePlanDraft((s) => s.update);
  const offersCardio = goal === 'fat' || goal === 'toned';

  return (
    <QuestionFrame
      title="How long is a session?"
      subtitle="Every session is built to fit, warm-ups and rests included."
      onContinue={onNext}
    >
      <View className="flex-row flex-wrap gap-sm">
        {sessionMinutes.map((m) => (
          <Chip
            key={m}
            label={`${m} min`}
            selected={m === minutes}
            onPress={() => update({ minutes: m })}
          />
        ))}
      </View>
      {offersCardio ? (
        <ToggleRow
          title="Finish with cardio"
          subtitle={`${minutes <= 45 ? 10 : minutes <= 60 ? 15 : 20} min of easy cardio at the end, inside your ${minutes} minutes.`}
          value={cardio}
          onChange={(v) => update({ cardio: v })}
        />
      ) : null}
    </QuestionFrame>
  );
}

import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Screen, StepProgress, Text } from '@/components';

import { PLAN_STEPS, usePlanDraft } from '../draft';

interface QuestionFrameProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  /** Optional questions offer Skip. */
  onSkip?: () => void;
  /** A live line above the button (e.g. the split these answers give). */
  note?: string;
}

/** One question of the plan questionnaire: back, progress, the question and a pinned Continue. */
export function QuestionFrame({
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
  onSkip,
  note,
}: QuestionFrameProps) {
  const router = useRouter();
  const step = usePlanDraft((s) => s.step);
  const goTo = usePlanDraft((s) => s.goTo);
  const back = () => (step === 0 ? router.back() : goTo(step - 1));

  return (
    <Screen
      title="Create plan"
      onBack={back}
      headerRight={
        <Text variant="label" tone="muted">
          {step + 1} of {PLAN_STEPS.length}
        </Text>
      }
      edges={['top', 'bottom']}
      scroll
      footer={
        <View className="gap-sm">
          {note ? (
            <Text variant="caption" tone="muted" className="text-center">
              {note}
            </Text>
          ) : null}
          <View className="flex-row gap-sm">
            {onSkip ? (
              <Button label="Skip" variant="secondary" className="flex-1" onPress={onSkip} />
            ) : null}
            <Button
              label={continueLabel}
              className="flex-1"
              fullWidth={!onSkip}
              disabled={continueDisabled}
              onPress={onContinue}
            />
          </View>
        </View>
      }
    >
      <View className="gap-lg">
        <StepProgress step={step + 1} total={PLAN_STEPS.length} />
        <View className="gap-xs">
          <Text variant="title">{title}</Text>
          {subtitle ? (
            <Text variant="body" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
    </Screen>
  );
}

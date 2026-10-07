import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, IconButton, Screen, StepProgress, Text } from '@/components';

import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import type { OnboardingStepId } from '../../onboarding';

interface OnboardingLayoutProps {
  step: OnboardingStepId;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  saving?: boolean;
  /** Save error, shown above the button. */
  error?: string | null;
}

/** Shared frame for every onboarding step: back, progress, title, form and a pinned Continue. */
export function OnboardingLayout({
  step,
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = 'Continue',
  saving = false,
  error,
}: OnboardingLayoutProps) {
  const { number, total, isFirst, goBack } = useOnboardingStep(step);

  return (
    <Screen
      edges={['top', 'bottom']}
      scroll
      avoidKeyboard
      footer={
        <View className="gap-sm">
          {error ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button label={continueLabel} fullWidth size="lg" loading={saving} onPress={onContinue} />
        </View>
      }
    >
      <View className="flex-row items-center gap-md pb-xl pt-sm">
        {isFirst ? null : (
          <IconButton
            icon="chevron-back"
            accessibilityLabel="Previous step"
            variant="surface"
            onPress={goBack}
          />
        )}
        <View className="flex-1">
          <StepProgress step={number} total={total} />
        </View>
        <Text variant="caption" tone="muted" numeric>
          {number} of {total}
        </Text>
      </View>
      <View className="gap-xl">
        <View className="gap-xs">
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
        </View>
        {children}
      </View>
    </Screen>
  );
}

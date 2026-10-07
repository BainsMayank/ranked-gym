import { useState } from 'react';

import { experienceOptions, type ExperienceLevel } from '@/lib/profile';

import { ChoiceList } from '../../components/fields/ChoiceList';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useSaveProfileStep } from '../../hooks/useSaveProfileStep';

/** Step 5: training experience, in plain language. Shapes plans, not ranks. */
export function ExperienceStep() {
  const { profile, save, saving, error, setError } = useSaveProfileStep();
  const { goNext } = useOnboardingStep('experience');
  const [level, setLevel] = useState<ExperienceLevel | null>(profile?.experience_level ?? null);

  const onContinue = () => {
    if (!level) return setError('Pick the one closest to you.');
    void save({ experience_level: level }, goNext);
  };

  return (
    <OnboardingLayout
      step="experience"
      title="How long have you been training?"
      subtitle="This shapes your plan. Your rank comes from what you lift."
      onContinue={onContinue}
      saving={saving}
      error={error}
    >
      <ChoiceList
        label="Experience"
        options={experienceOptions}
        value={level}
        onChange={(l) => {
          setLevel(l);
          setError(null);
        }}
      />
    </OnboardingLayout>
  );
}

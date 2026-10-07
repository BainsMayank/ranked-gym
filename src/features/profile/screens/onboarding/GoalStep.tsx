import { useState } from 'react';

import { goalOptions, type PrimaryGoal } from '@/lib/profile';

import { ChoiceList } from '../../components/fields/ChoiceList';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useSaveProfileStep } from '../../hooks/useSaveProfileStep';

/** Step 6: main goal (same list as the plan generator, which starts on this choice). */
export function GoalStep() {
  const { profile, save, saving, error, setError } = useSaveProfileStep();
  const { goNext } = useOnboardingStep('goal');
  const [goal, setGoal] = useState<PrimaryGoal | null>(profile?.primary_goal ?? null);

  const onContinue = () => {
    if (!goal) return setError('Pick your main goal.');
    void save({ primary_goal: goal }, goNext);
  };

  return (
    <OnboardingLayout
      step="goal"
      title="What's your main goal?"
      subtitle="Pick one. You can change it any time."
      onContinue={onContinue}
      saving={saving}
      error={error}
    >
      <ChoiceList
        label="Main goal"
        options={goalOptions}
        value={goal}
        grid
        onChange={(g) => {
          setGoal(g);
          setError(null);
        }}
      />
    </OnboardingLayout>
  );
}

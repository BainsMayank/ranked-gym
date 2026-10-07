import { useState } from 'react';

import type { WeightUnit } from '@/lib/units';

import { ChoiceList } from '../../components/fields/ChoiceList';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useSaveProfileStep } from '../../hooks/useSaveProfileStep';

const UNIT_OPTIONS = [
  { id: 'kg', title: 'Kilograms (kg)', subtitle: 'Heights in centimetres' },
  { id: 'lb', title: 'Pounds (lb)', subtitle: 'Heights in feet and inches' },
] as const satisfies readonly { id: WeightUnit; title: string; subtitle: string }[];

/** Step 2: kg or lb. Everything is stored in kg; this only changes what you see. */
export function UnitsStep() {
  const { profile, save, saving, error } = useSaveProfileStep();
  const { goNext } = useOnboardingStep('units');
  const [units, setUnits] = useState<WeightUnit>(profile?.units ?? 'kg');

  return (
    <OnboardingLayout
      step="units"
      title="Which units do you lift in?"
      subtitle="Switch any time in Settings. Your history converts automatically."
      onContinue={() => void save({ units }, goNext)}
      saving={saving}
      error={error}
    >
      <ChoiceList label="Units" options={UNIT_OPTIONS} value={units} onChange={setUnits} />
    </OnboardingLayout>
  );
}

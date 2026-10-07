import { useState } from 'react';
import { View } from 'react-native';
import { z } from 'zod';

import { Input, Text } from '@/components';
import { useZodForm } from '@/lib/forms/useZodForm';
import { birthYearSchema, sexOptions, type SexForStandards } from '@/lib/profile';

import { ChoiceList } from '../../components/fields/ChoiceList';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useSaveProfileStep } from '../../hooks/useSaveProfileStep';

const schema = z.object({ birthYear: birthYearSchema() });

/** Step 3: which strength standards to rank on, and birth year (blocks under-13s). */
export function AboutStep() {
  const { profile, save, saving, error } = useSaveProfileStep();
  const { goNext } = useOnboardingStep('about');
  const [sex, setSex] = useState<SexForStandards>(profile?.sex_for_standards ?? 'unspecified');
  const form = useZodForm(schema, { birthYear: profile?.birth_year?.toString() ?? '' });

  const onContinue = () =>
    form.submit(
      ({ birthYear }) => void save({ sex_for_standards: sex, birth_year: birthYear }, goNext),
    );

  return (
    <OnboardingLayout
      step="about"
      title="A little about you"
      subtitle="So your ranks compare you fairly."
      onContinue={onContinue}
      saving={saving}
      error={error}
    >
      <View className="gap-sm">
        <Text variant="label" tone="muted">
          Strength standards
        </Text>
        <ChoiceList label="Strength standards" options={sexOptions} value={sex} onChange={setSex} />
        <Text variant="caption" tone="muted">
          Used only to compare you to fair strength standards. It never shows on your profile.
        </Text>
      </View>
      <Input
        label="Birth year"
        placeholder="2005"
        keyboardType="number-pad"
        maxLength={4}
        helperText="Leaderboards group people by age bracket. We only store the year."
        {...form.field('birthYear')}
      />
    </OnboardingLayout>
  );
}

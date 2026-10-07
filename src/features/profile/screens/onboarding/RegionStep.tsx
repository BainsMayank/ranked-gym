import { ScrollView, View } from 'react-native';
import { z } from 'zod';

import { Chip, Input } from '@/components';
import { useZodForm } from '@/lib/forms/useZodForm';
import { citySchema, collegeSchema, emptyToNull } from '@/lib/profile';

import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useSaveProfileStep } from '../../hooks/useSaveProfileStep';

const schema = z.object({ city: citySchema, college: collegeSchema });

// Shortcuts only; any city can be typed. Curated region lists come with Phase 10 (open decision #11).
const POPULAR_CITIES = [
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Chandigarh',
] as const;

/** Step 7: city and optional college, for regional leaderboards. */
export function RegionStep() {
  const { profile, save, saving, error } = useSaveProfileStep();
  const { goNext } = useOnboardingStep('region');
  const form = useZodForm(schema, { city: profile?.city ?? '', college: profile?.college ?? '' });

  const onContinue = () =>
    form.submit(({ city, college }) => void save({ city, college: emptyToNull(college) }, goNext));

  return (
    <OnboardingLayout
      step="region"
      title="Where do you train?"
      subtitle="For your city and college leaderboards."
      onContinue={onContinue}
      saving={saving}
      error={error}
    >
      <View className="gap-sm">
        <Input
          label="City"
          placeholder="Pune"
          autoComplete="off"
          textContentType="addressCity"
          maxLength={60}
          {...form.field('city')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="-mx-lg"
          contentContainerClassName="gap-xs px-lg"
        >
          {POPULAR_CITIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={form.values.city === c}
              onPress={() => form.setValue('city', c)}
            />
          ))}
        </ScrollView>
      </View>
      <Input
        label="College (optional)"
        placeholder="e.g. IIT Bombay"
        maxLength={100}
        helperText="Leave blank if you're not at college."
        {...form.field('college')}
      />
    </OnboardingLayout>
  );
}

import { useMemo } from 'react';
import { z } from 'zod';

import { Input, Skeleton } from '@/components';
import { useZodForm } from '@/lib/forms/useZodForm';
import {
  bodyweightSchema,
  useLatestBodyweight,
  useLogBodyweight,
  type BodyweightLog,
  type Profile,
} from '@/lib/profile';
import { fromKg, type WeightUnit } from '@/lib/units';

import { profileErrorMessage } from '../../api/profileErrors';
import { HeightField } from '../../components/fields/HeightField';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { heightFields, heightValues, parseHeight } from '../../heightForm';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useSaveProfileStep } from '../../hooks/useSaveProfileStep';

function bodySchema(unit: WeightUnit) {
  return z
    .object({ ...heightFields, weight: bodyweightSchema(unit) })
    .transform((v, ctx) => ({ heightCm: parseHeight(unit, v, ctx), weightKg: v.weight }));
}

/** Step 4: height and today's bodyweight (the first weigh-in; ranks score sets at bodyweight). */
export function BodyStep() {
  const latest = useLatestBodyweight();
  const { profile } = useSaveProfileStep();
  // Wait for the last weigh-in so going back shows it instead of an empty field.
  if (latest.isPending && latest.fetchStatus !== 'paused') {
    return (
      <OnboardingLayout step="body" title="Height and weight" onContinue={() => undefined}>
        <Skeleton height={72} />
        <Skeleton height={72} />
      </OnboardingLayout>
    );
  }
  return <BodyForm profile={profile} latest={latest.data} />;
}

function BodyForm({ profile, latest }: { profile?: Profile; latest: BodyweightLog | null }) {
  const unit = profile?.units ?? 'kg';
  const { save, saving, error, setError } = useSaveProfileStep();
  const logWeight = useLogBodyweight();
  const { goNext } = useOnboardingStep('body');
  const schema = useMemo(() => bodySchema(unit), [unit]);
  const form = useZodForm(schema, {
    ...heightValues(profile?.height_cm),
    weight: latest ? String(fromKg(latest.weight_kg, unit)) : '',
  });

  const onContinue = () =>
    form.submit(
      ({ heightCm, weightKg }) =>
        void save({ height_cm: heightCm }, async () => {
          try {
            // Still onboarding, so an existing entry was logged here: correct it instead of adding one.
            if (latest?.weight_kg !== weightKg) {
              await logWeight.mutateAsync({ weightKg, replaceId: latest?.id });
            }
            goNext();
          } catch (e) {
            setError(profileErrorMessage(e));
          }
        }),
    );

  return (
    <OnboardingLayout
      step="body"
      title="Height and weight"
      subtitle="Ranks are pound for pound, so your bodyweight keeps them fair. Only you can see it."
      onContinue={onContinue}
      saving={saving || logWeight.isPending}
      error={error}
    >
      <HeightField
        unit={unit}
        values={form.values}
        onChange={form.setValue}
        onBlur={form.blur}
        errors={form.errors}
      />
      <Input
        label={`Bodyweight (${unit})`}
        placeholder={unit === 'kg' ? '68.5' : '151'}
        keyboardType="decimal-pad"
        maxLength={6}
        {...form.field('weight')}
      />
    </OnboardingLayout>
  );
}

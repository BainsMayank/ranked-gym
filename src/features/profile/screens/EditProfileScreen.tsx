import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useZodForm } from '@/lib/forms/useZodForm';
import {
  experienceOptions,
  goalOptions,
  sexOptions,
  useProfile,
  useUpdateProfile,
  useUsernameAvailability,
  type ExperienceLevel,
  type PrimaryGoal,
  type Profile,
  type SexForStandards,
} from '@/lib/profile';

import { profileErrorMessage } from '../api/profileErrors';
import { BodyweightLogger } from '../components/edit/BodyweightLogger';
import { ChoiceSegments } from '../components/edit/ChoiceSegments';
import { FormSection } from '../components/edit/FormSection';
import { HeightField } from '../components/fields/HeightField';
import { UsernameField } from '../components/fields/UsernameField';
import { changedFields, editProfileSchema, editProfileValues } from '../editProfileForm';

/** Everything asked in onboarding (and the bio), editable in one form. Units and privacy are in Settings. */
export function EditProfileScreen() {
  const { data: profile } = useProfile();
  if (!profile) return <Screen title="Edit profile">{null}</Screen>;
  return <EditProfileForm profile={profile} />;
}

function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const update = useUpdateProfile();
  const unit = profile.units;
  const schema = useMemo(() => editProfileSchema(unit), [unit]);
  const form = useZodForm(schema, editProfileValues(profile));
  const availability = useUsernameAvailability(form.values.username, profile.username);
  const [sex, setSex] = useState<SexForStandards>(profile.sex_for_standards);
  const [experience, setExperience] = useState<ExperienceLevel | null>(profile.experience_level);
  const [goal, setGoal] = useState<PrimaryGoal | null>(profile.primary_goal);
  const [error, setError] = useState<string | null>(null);

  const save = () =>
    form.submit(async (fields) => {
      if (availability.status === 'taken' || availability.status === 'checking') return;
      setError(null);
      const changes = changedFields(profile, {
        ...fields,
        sex_for_standards: sex,
        experience_level: experience,
        primary_goal: goal,
      });
      try {
        if (Object.keys(changes).length > 0) await update.mutateAsync(changes);
        router.back();
      } catch (e) {
        setError(profileErrorMessage(e));
      }
    });

  return (
    <Screen
      title="Edit profile"
      onBack={() => router.back()}
      scroll
      avoidKeyboard
      footer={
        <View className="gap-sm">
          {error ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button label="Save" fullWidth size="lg" loading={update.isPending} onPress={save} />
        </View>
      }
    >
      <View className="gap-xxl">
        <FormSection title="You">
          <Input label="Name" maxLength={40} autoComplete="name" {...form.field('displayName')} />
          <UsernameField
            value={form.values.username}
            onChangeText={(t) => form.setValue('username', t)}
            onBlur={() => form.blur('username')}
            error={form.errors.username}
            status={availability.status}
          />
          <Input
            label="Bio"
            placeholder="Squats before sunrise."
            multiline
            maxLength={160}
            helperText={`${form.values.bio.length}/160`}
            {...form.field('bio')}
          />
        </FormSection>

        <FormSection title="Body">
          <ChoiceSegments
            label="Strength standards"
            options={sexOptions}
            value={sex}
            onChange={setSex}
          />
          <Text variant="caption" tone="muted">
            {sexOptions.find((o) => o.id === sex)?.subtitle}. Used only to compare you with fair
            strength standards; nobody else sees it. Changing it re-ranks your lifts.
          </Text>
          <Input
            label="Birth year"
            keyboardType="number-pad"
            maxLength={4}
            {...form.field('birthYear')}
          />
          <HeightField
            unit={unit}
            values={form.values}
            onChange={form.setValue}
            onBlur={form.blur}
            errors={form.errors}
          />
          <BodyweightLogger unit={unit} />
        </FormSection>

        <FormSection title="Training">
          <ChoiceSegments
            label="Experience"
            options={experienceOptions}
            value={experience}
            onChange={setExperience}
          />
          <ChoiceSegments label="Main goal" options={goalOptions} value={goal} onChange={setGoal} />
        </FormSection>

        <FormSection title="Leaderboards">
          <Input label="City" maxLength={60} {...form.field('city')} />
          <Input label="College (optional)" maxLength={100} {...form.field('college')} />
        </FormSection>
      </View>
    </Screen>
  );
}

import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { Input, Text } from '@/components';
import { signOut, useAuthStore } from '@/lib/auth';
import { useZodForm } from '@/lib/forms/useZodForm';
import {
  displayNameSchema,
  suggestUsername,
  usernameSchema,
  useUsernameAvailability,
} from '@/lib/profile';

import { UsernameField } from '../../components/fields/UsernameField';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useSaveProfileStep } from '../../hooks/useSaveProfileStep';

const schema = z.object({ displayName: displayNameSchema, username: usernameSchema });

/** Step 1: what friends see. The username is claimed as soon as this step saves. */
export function NameStep() {
  const { profile, save, saving, error, setError } = useSaveProfileStep();
  const { goNext } = useOnboardingStep('name');
  const email = useAuthStore((s) => s.session?.user.email) ?? '';
  const form = useZodForm(schema, {
    displayName: profile?.display_name ?? '',
    username:
      profile?.username ?? suggestUsername(profile?.display_name ?? email.split('@')[0] ?? ''),
  });
  const availability = useUsernameAvailability(form.values.username, profile?.username);

  const onContinue = () =>
    form.submit(({ displayName, username }) => {
      if (availability.status === 'taken') return;
      if (availability.status === 'checking') {
        setError('Still checking that username. Try again in a second.');
        return;
      }
      void save({ display_name: displayName, username }, goNext);
    });

  return (
    <OnboardingLayout
      step="name"
      title="What should we call you?"
      subtitle="Friends find you by your username. You can change both later."
      onContinue={onContinue}
      saving={saving}
      error={error}
    >
      <View className="gap-lg">
        <Input
          label="Name"
          placeholder="Asha Rao"
          autoComplete="name"
          textContentType="name"
          maxLength={40}
          returnKeyType="next"
          {...form.field('displayName')}
        />
        <UsernameField
          value={form.values.username}
          onChangeText={(t) => form.setValue('username', t)}
          onBlur={() => form.blur('username')}
          error={form.errors.username}
          status={availability.status}
        />
        {email ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => void signOut()}
            hitSlop={12}
            className="self-start"
          >
            <Text variant="caption" tone="muted">
              Signed in as {email}. Not you?{' '}
              <Text variant="caption" tone="primary">
                Sign out
              </Text>
            </Text>
          </Pressable>
        ) : null}
      </View>
    </OnboardingLayout>
  );
}

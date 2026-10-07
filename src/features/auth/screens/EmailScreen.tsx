import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Input, Screen, Text } from '@/components';
import { useZodForm } from '@/lib/forms/useZodForm';

import { authErrorMessage } from '../api/authErrors';
import { sendEmailCode } from '../api/emailOtp';
import { usePendingEmail } from '../store';

const schema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: 'Enter your email.' })
    .pipe(z.email({ error: "That email address doesn't look right." })),
});

/** Sign in or sign up, step 1: the email to send a one-time code to. */
export function EmailScreen() {
  const router = useRouter();
  const pending = usePendingEmail();
  const form = useZodForm(schema, { email: pending.email });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = () =>
    form.submit(async ({ email }) => {
      setSending(true);
      setError(null);
      try {
        await sendEmailCode(email);
        pending.setSent(email);
        router.push('/sign-in/code');
      } catch (e) {
        setError(authErrorMessage(e));
      } finally {
        setSending(false);
      }
    });

  return (
    <Screen
      edges={['top', 'bottom']}
      scroll
      avoidKeyboard
      onBack={() => router.back()}
      footer={<Button label="Send code" fullWidth size="lg" loading={sending} onPress={send} />}
    >
      <View className="gap-lg">
        <View className="gap-xs">
          <Text variant="title">What&apos;s your email?</Text>
          <Text tone="muted">
            We&apos;ll send a one-time code. New here? This creates your account.
          </Text>
        </View>
        <Input
          label="Email"
          placeholder="you@college.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          autoFocus
          onSubmitEditing={send}
          {...form.field('email')}
        />
        {error ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

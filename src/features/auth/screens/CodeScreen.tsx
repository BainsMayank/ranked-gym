import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View, type TextInput } from 'react-native';

import { Button, Screen, Text } from '@/components';

import { authErrorMessage } from '../api/authErrors';
import { sendEmailCode, verifyEmailCode } from '../api/emailOtp';
import { CodeInput } from '../components/CodeInput';
import { OTP_LENGTH } from '../constants';
import { useResendCooldown } from '../hooks/useResendCooldown';
import { usePendingEmail } from '../store';

/**
 * Sign in or sign up, step 2: the emailed code. Submits by itself once every digit is in; on success
 * the auth gate moves on to onboarding or the app.
 */
export function CodeScreen() {
  const router = useRouter();
  const { email, sentAt, setSent } = usePendingEmail();
  const cooldown = useResendCooldown(sentAt);
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const verify = async (token: string) => {
    if (token.length !== OTP_LENGTH || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await verifyEmailCode(email, token);
    } catch (e) {
      setError(authErrorMessage(e));
      setCode('');
      setVerifying(false);
      // The input is disabled while verifying; refocus once it's editable again.
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    setVerifying(false);
  };

  const onChange = (next: string) => {
    setCode(next);
    if (error) setError(null);
    if (next.length === OTP_LENGTH) void verify(next);
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      await sendEmailCode(email);
      setSent(email);
      setNotice('New code sent.');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      scroll
      avoidKeyboard
      onBack={() => router.back()}
      footer={
        <Button
          label="Verify"
          fullWidth
          size="lg"
          loading={verifying}
          disabled={code.length !== OTP_LENGTH}
          onPress={() => void verify(code)}
        />
      }
    >
      <View className="gap-lg">
        <View className="gap-xs">
          <Text variant="title">Check your email</Text>
          <Text tone="muted">
            Enter the {OTP_LENGTH}-digit code we sent to <Text>{email}</Text>.
          </Text>
        </View>
        <CodeInput
          ref={inputRef}
          length={OTP_LENGTH}
          value={code}
          onChange={onChange}
          error={!!error}
          editable={!verifying}
        />
        {error || notice ? (
          <Text
            variant="caption"
            tone={error ? 'danger' : 'success'}
            accessibilityLiveRegion="polite"
          >
            {error ?? notice}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap items-center justify-between gap-sm">
          <Button
            label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            variant="ghost"
            size="sm"
            loading={resending}
            disabled={cooldown > 0}
            onPress={() => void resend()}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use a different email"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Text variant="caption" tone="muted">
              Wrong email?{' '}
              <Text variant="caption" tone="primary">
                Change it
              </Text>
            </Text>
          </Pressable>
        </View>
        <Text variant="caption" tone="muted">
          Can&apos;t find it? Check spam or promotions. Codes expire after an hour.
        </Text>
      </View>
    </Screen>
  );
}

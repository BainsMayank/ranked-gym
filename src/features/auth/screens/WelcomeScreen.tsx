import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useAuthStore } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

import { EmblemCluster } from '../components/EmblemCluster';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

/** Sign-up and log-in entry: Google, or a one-time code by email (one flow for both). */
export function WelcomeScreen() {
  const router = useRouter();
  const google = useGoogleSignIn();
  const setPreview = useAuthStore((s) => s.setPreview);
  const configured = isSupabaseConfigured();
  const toEmail = () => router.push('/sign-in/email');

  return (
    <Screen edges={['top', 'bottom']} scroll className="flex-grow justify-center">
      <View className="gap-xl py-xl">
        <EmblemCluster />
        <View className="items-center gap-sm">
          <Text variant="overline" tone="muted">
            Ranked Gym
          </Text>
          <Text variant="display" className="text-center">
            Lift. Rank up.{'\n'}
            <Text variant="display" tone="primary">
              Grow together.
            </Text>
          </Text>
          <Text tone="muted" className="text-center">
            Every lift earns you a rank. Train with friends, climb your college leagues and keep
            each other consistent.
          </Text>
        </View>
        <View className="gap-sm">
          <Button
            label="Continue with Google"
            icon="logo-google"
            fullWidth
            size="lg"
            loading={google.pending}
            disabled={!configured}
            onPress={() => void google.start()}
          />
          <Button
            label="Continue with email"
            icon="mail-outline"
            variant="outline"
            fullWidth
            size="lg"
            disabled={!configured}
            onPress={toEmail}
          />
          {google.error ? (
            <Text
              variant="caption"
              tone="danger"
              className="text-center"
              accessibilityLiveRegion="polite"
            >
              {google.error}
            </Text>
          ) : null}
        </View>
        {configured ? (
          <View className="items-center gap-sm">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log in"
              onPress={toEmail}
              hitSlop={12}
            >
              <Text tone="muted">
                Already training with us? <Text tone="primary">Log in</Text>
              </Text>
            </Pressable>
            <Text variant="caption" tone="muted" className="text-center">
              By continuing you agree to the Terms and Privacy Policy.
            </Text>
          </View>
        ) : (
          <View className="gap-sm rounded-md bg-surface p-lg">
            <Text variant="label">Supabase isn&apos;t set up</Text>
            <Text variant="caption" tone="muted">
              Copy .env.example to .env, add SUPABASE_URL and SUPABASE_ANON_KEY, then restart the
              dev server.
            </Text>
            {__DEV__ ? (
              <Button
                label="Preview the app on mock data"
                variant="secondary"
                size="sm"
                onPress={() => setPreview(true)}
              />
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

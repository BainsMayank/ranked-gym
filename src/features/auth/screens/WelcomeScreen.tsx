import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Screen, Text } from '@/components';

import { EmblemCluster } from '../components/EmblemCluster';

/** Sign-up entry. Auth providers are wired in Phase 1 (open decision #12); buttons preview the app for now. */
export function WelcomeScreen() {
  const router = useRouter();
  const enter = () => router.replace('/home');

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
            label="Continue with Apple"
            icon="logo-apple"
            fullWidth
            size="lg"
            onPress={enter}
          />
          <Button
            label="Continue with Google"
            icon="logo-google"
            variant="secondary"
            fullWidth
            size="lg"
            onPress={enter}
          />
          <Button
            label="Sign up with email"
            icon="mail-outline"
            variant="outline"
            fullWidth
            size="lg"
            onPress={enter}
          />
        </View>
        <View className="items-center gap-sm">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log in"
            onPress={enter}
            hitSlop={8}
          >
            <Text tone="muted">
              Already training with us? <Text tone="primary">Log in</Text>
            </Text>
          </Pressable>
          <Text variant="caption" tone="muted" className="text-center">
            By continuing you agree to the Terms and Privacy Policy.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

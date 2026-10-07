import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Onboarding steps (see src/features/profile/onboarding.ts for the order). */
export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}

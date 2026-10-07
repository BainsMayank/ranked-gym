import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Signed-out stack: Welcome → email → code. */
export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}

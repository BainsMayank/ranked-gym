import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export const unstable_settings = { initialRouteName: 'index' };

/** Friends hub with Leaderboards pushed on top (tab bar stays visible). */
export default function FriendsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="leaderboards" />
    </Stack>
  );
}

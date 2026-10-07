import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

// Deep links into settings still get Profile underneath, so Back always works.
export const unstable_settings = { initialRouteName: 'index' };

export default function ProfileLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Profile' }} />
      <Stack.Screen name="edit" options={{ headerShown: false }} />
      <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      <Stack.Screen name="settings/[section]" options={{ title: '' }} />
    </Stack>
  );
}

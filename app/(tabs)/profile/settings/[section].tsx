import { Redirect, Stack, useLocalSearchParams } from 'expo-router';

import { SettingsSectionScreen } from '@/features/profile/screens/SettingsSectionScreen';
import { isSettingsSectionId, settingsSections } from '@/features/profile/settingsSections';

export default function SettingsSectionRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (!isSettingsSectionId(section)) return <Redirect href="/profile/settings" />;
  return (
    <>
      <Stack.Screen options={{ title: settingsSections[section].title }} />
      <SettingsSectionScreen section={section} />
    </>
  );
}

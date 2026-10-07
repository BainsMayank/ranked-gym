import { View } from 'react-native';

import { EmptyState, Screen, SegmentedControl, Text } from '@/components';
import { useThemeStore, type ThemeMode } from '@/theme';

import { AccountSettings } from '../components/settings/AccountSettings';
import { PrivacySettings } from '../components/settings/PrivacySettings';
import { UnitsSettings } from '../components/settings/UnitsSettings';
import { settingsSections, type SettingsSectionId } from '../settingsSections';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
] as const satisfies readonly { value: ThemeMode; label: string }[];

function AppearanceSettings() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  return (
    <View className="gap-sm">
      <Text variant="label" tone="muted">
        Theme
      </Text>
      <SegmentedControl
        accessibilityLabel="Theme"
        options={THEME_OPTIONS}
        value={mode}
        onChange={setMode}
      />
    </View>
  );
}

export function SettingsSectionScreen({ section }: { section: SettingsSectionId }) {
  const s = settingsSections[section];
  return (
    <Screen edges={[]} scroll className="pt-lg">
      {section === 'appearance' ? (
        <AppearanceSettings />
      ) : section === 'units' ? (
        <UnitsSettings />
      ) : section === 'privacy' ? (
        <PrivacySettings />
      ) : section === 'account' ? (
        <AccountSettings />
      ) : (
        <EmptyState icon={s.icon} title={s.title} description={s.description} />
      )}
    </Screen>
  );
}

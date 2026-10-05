import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components';

import { ListRow } from '../components/ListRow';
import { settingsSectionIds, settingsSections } from '../settingsSections';

export function SettingsScreen() {
  const router = useRouter();

  return (
    <Screen edges={[]} scroll className="pt-lg">
      <View className="gap-sm">
        {settingsSectionIds.map((id) => {
          const s = settingsSections[id];
          return (
            <ListRow
              key={id}
              title={s.title}
              icon={s.icon}
              onPress={() =>
                router.push({ pathname: '/profile/settings/[section]', params: { section: id } })
              }
            />
          );
        })}
      </View>
    </Screen>
  );
}

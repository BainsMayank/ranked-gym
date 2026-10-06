import { useRouter } from 'expo-router';

import { Icon, ListGroup, ListItem, Screen } from '@/components';

import { settingsSectionIds, settingsSections } from '../settingsSections';

export function SettingsScreen() {
  const router = useRouter();

  return (
    <Screen edges={[]} scroll className="pt-lg">
      <ListGroup>
        {settingsSectionIds.map((id) => {
          const s = settingsSections[id];
          return (
            <ListItem
              key={id}
              title={s.title}
              leading={<Icon name={s.icon} tone="textMuted" />}
              onPress={() =>
                router.push({ pathname: '/profile/settings/[section]', params: { section: id } })
              }
            />
          );
        })}
      </ListGroup>
    </Screen>
  );
}

import { useRouter, type Href } from 'expo-router';
import { ScrollView, View } from 'react-native';

import {
  BadgeTile,
  IconButton,
  ListGroup,
  ListItem,
  Screen,
  SectionHeader,
  Stat,
} from '@/components';

import { CustomiseCard } from '../components/CustomiseCard';
import { LevelCard } from '../components/LevelCard';
import { ProfileHeaderCard } from '../components/ProfileHeaderCard';
import { badges, profileStats } from '../mocks';

const SETTINGS: { title: string; value: string; href: Href }[] = [
  { title: 'Account & sign-in', value: 'Apple ID', href: '/welcome' },
  { title: 'Body stats', value: '71.4 kg · 176 cm', href: '/profile/settings/units' },
  { title: 'Units', value: 'kg · cm', href: '/profile/settings/units' },
  { title: 'Privacy', value: 'Friends only', href: '/profile/settings/privacy' },
  { title: 'Notifications', value: 'On', href: '/profile/settings/notifications' },
  { title: 'Appearance', value: 'Dark', href: '/profile/settings/appearance' },
  { title: 'Your data', value: 'Export, delete', href: '/profile/settings/data' },
];

/** Profile: identity, level, stats, badges, cosmetics and settings. */
export function ProfileScreen() {
  const router = useRouter();
  const earned = badges.filter((b) => !b.locked).length;

  return (
    <Screen
      title="Profile"
      scroll
      headerRight={
        <View className="flex-row gap-sm">
          <IconButton icon="share-outline" accessibilityLabel="Share profile" variant="surface" />
          <IconButton
            icon="settings-outline"
            accessibilityLabel="Settings"
            variant="surface"
            onPress={() => router.push('/profile/settings')}
          />
        </View>
      }
    >
      <View className="gap-lg">
        <ProfileHeaderCard />
        <LevelCard />
        <View className="flex-row gap-sm">
          {profileStats.map((s) => (
            <Stat
              key={s.label}
              label={s.label}
              value={s.value}
              valueTone={s.streak ? 'streak' : 'default'}
              boxed
              center
              className="flex-1"
            />
          ))}
        </View>

        <SectionHeader title="Badges" meta={`${earned} of 60`} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-lg"
          contentContainerClassName="gap-sm px-lg"
        >
          {badges.map((b) => (
            <BadgeTile key={b.label} {...b} />
          ))}
        </ScrollView>

        <CustomiseCard />

        <ListGroup>
          {SETTINGS.map((s) => (
            <ListItem
              key={s.title}
              title={s.title}
              value={s.value}
              onPress={() => router.push(s.href)}
            />
          ))}
          {__DEV__ ? (
            <ListItem
              title="Component gallery"
              value="Dev only"
              onPress={() => router.push('/dev/components')}
            />
          ) : null}
        </ListGroup>
      </View>
    </Screen>
  );
}

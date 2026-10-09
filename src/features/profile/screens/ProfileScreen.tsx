import { useWorkoutHistory } from '@/lib/workouts';
import { useRouter, type Href } from 'expo-router';
import { useAuthStore } from '@/lib/auth';
import { optionTitle, useLatestBodyweight, useProfile, visibilityOptions } from '@/lib/profile';
import { formatHeight, formatWeight } from '@/lib/units';
import { useThemeStore } from '@/theme';
import { ScrollView, View } from 'react-native';

import {
  BadgeTile,
  IconButton,
  ListGroup,
  SyncStatus,
  ListItem,
  Screen,
  SectionHeader,
  Stat,
} from '@/components';

import { CustomiseCard } from '../components/CustomiseCard';
import { LevelCard } from '../components/LevelCard';
import { ProfileHeaderCard } from '../components/ProfileHeaderCard';
import { badges, profileStats } from '../mocks';

const THEME_LABEL = { dark: 'Dark', light: 'Light', system: 'System' } as const;

/** The settings list, showing current values from the profile. */
function useSettingsRows(): { title: string; value: string; href: Href }[] {
  const { data: profile } = useProfile();
  const { data: weight } = useLatestBodyweight();
  const provider = useAuthStore((s) => s.session?.user.app_metadata.provider);
  const theme = useThemeStore((s) => s.mode);
  const unit = profile?.units ?? 'kg';
  const body = [
    weight ? formatWeight(weight.weight_kg, unit) : null,
    profile?.height_cm ? formatHeight(profile.height_cm, unit) : null,
  ].filter(Boolean);

  return [
    {
      title: 'Account & sign-in',
      value: provider === 'google' ? 'Google' : 'Email',
      href: '/profile/settings/account',
    },
    { title: 'Body stats', value: body.join(' · ') || 'Add', href: '/profile/edit' },
    {
      title: 'Units',
      value: unit === 'kg' ? 'kg · cm' : 'lb · ft/in',
      href: '/profile/settings/units',
    },
    {
      title: 'Privacy',
      value: optionTitle(visibilityOptions, profile?.visibility) ?? '',
      href: '/profile/settings/privacy',
    },
    { title: 'Notifications', value: 'On', href: '/profile/settings/notifications' },
    { title: 'Appearance', value: THEME_LABEL[theme], href: '/profile/settings/appearance' },
    { title: 'Your data', value: 'Export, delete', href: '/profile/settings/data' },
  ];
}

/** Profile: identity, level, stats, badges, cosmetics and settings. */
export function ProfileScreen() {
  const router = useRouter();
  const settings = useSettingsRows();
  const earned = badges.filter((b) => !b.locked).length;
  const { data: history } = useWorkoutHistory();

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

        <ListGroup>
          <ListItem
            title="Workout history"
            subtitle={
              history?.length
                ? `${history.length} ${history.length === 1 ? 'workout' : 'workouts'} logged`
                : 'Your finished workouts'
            }
            trailing={<SyncStatus showLabel />}
            onPress={() => router.push('/workouts')}
          />
        </ListGroup>

        <CustomiseCard />

        <ListGroup>
          {settings.map((s) => (
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

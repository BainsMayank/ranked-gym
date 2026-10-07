import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, RankTag, Text } from '@/components';
import { useProfile } from '@/lib/profile';

import { me } from '../mocks';

/** Identity from the real profile; rank, level and title stay mock until Phases 6 and 11. */
export function ProfileHeaderCard() {
  const router = useRouter();
  const { data: profile } = useProfile();
  // Dev preview (no Supabase) has no profile, so fall back to the mock identity.
  const name = profile?.display_name ?? me.name;
  const handle = profile?.username ? `@${profile.username}` : me.handle;
  const place = profile ? (profile.college ?? profile.city) : me.college;
  const bio = profile ? profile.bio : me.bio;

  return (
    <View className="gap-sm rounded-lg border-t border-edge bg-surface p-lg">
      <View className="flex-row items-start justify-between">
        <Avatar
          name={name}
          uri={profile?.avatar_url}
          size="xl"
          ring={{ tier: me.rank.tier }}
          level={me.level}
        />
        <Button
          label="Edit profile"
          variant="outline"
          size="sm"
          onPress={() => router.push('/profile/edit')}
        />
      </View>
      <View className="mt-sm gap-xxs">
        <View className="flex-row flex-wrap items-center gap-sm">
          <Text variant="title">{name}</Text>
          <RankTag tier={me.rank.tier} division={me.rank.division} />
        </View>
        <Text variant="caption" tone="muted">
          {place ? `${handle} · ${place}` : handle}
        </Text>
        <Text variant="label" tone="primary">
          “{me.title}”
        </Text>
      </View>
      {bio ? <Text tone="muted">{bio}</Text> : null}
    </View>
  );
}

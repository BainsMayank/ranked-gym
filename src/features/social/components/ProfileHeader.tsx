import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, RankTag, Text } from '@/components';
import type { Profile } from '@/lib/social';

import { displayName } from '../format';
import { ProfileActions } from './ProfileActions';

/** Who they are, what you share, and what you can do. */
export function ProfileHeader({ profile }: { profile: Profile }) {
  const name = displayName(profile);
  const place = [profile.college, profile.city].filter(Boolean).join(' · ');
  const counts = profile.counts;
  return (
    <View className="gap-md px-lg pb-lg">
      <View className="flex-row items-center gap-lg">
        <Avatar
          name={name}
          uri={profile.avatarUrl}
          size="xl"
          ring={profile.rank ? { tier: profile.rank.tier } : undefined}
        />
        <View className="flex-1 gap-xxs">
          <Text variant="title" numberOfLines={2}>
            {name}
          </Text>
          {profile.username ? (
            <Text tone="muted" numberOfLines={1}>
              @{profile.username}
            </Text>
          ) : null}
          {profile.rank ? (
            <RankTag tier={profile.rank.tier} division={profile.rank.division} size="md" />
          ) : null}
        </View>
      </View>
      {place ? (
        <Text variant="label" tone="muted">
          {place}
        </Text>
      ) : null}
      {profile.bio ? <Text>{profile.bio}</Text> : null}
      {counts ? (
        <Text variant="label" tone="muted" numeric>
          {counts.friends} {counts.friends === 1 ? 'friend' : 'friends'} · {counts.followers}{' '}
          {counts.followers === 1 ? 'follower' : 'followers'}
          {profile.mutualFriends ? ` · ${profile.mutualFriends} mutual` : ''}
          {profile.relationship.followsMe ? ' · follows you' : ''}
        </Text>
      ) : null}
      {profile.relationship.me ? (
        <Button
          label="Edit profile"
          variant="outline"
          onPress={() => router.push('/profile/edit')}
          fullWidth
        />
      ) : (
        <ProfileActions profile={profile} />
      )}
      {profile.relationship.blocked ? (
        <Text variant="caption" tone="muted">
          You blocked {name}. Neither of you sees the other’s posts or profile.
        </Text>
      ) : !profile.canView ? (
        <Text variant="caption" tone="muted">
          {profile.visibility === 'private'
            ? `${name}’s profile is private.`
            : `Only ${name}’s friends see their posts and details.`}
        </Text>
      ) : null}
    </View>
  );
}

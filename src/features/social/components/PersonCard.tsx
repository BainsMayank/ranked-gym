import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, PressableScale, RankTag, Text, showToast } from '@/components';
import { socialErrorMessage, useFollow, useFriendAction, type Suggestion } from '@/lib/social';

import { displayName, reasonLabel } from '../format';

/** A suggested training partner: who, why, and Add friend / Follow. */
export function PersonCard({ person }: { person: Suggestion }) {
  const friend = useFriendAction();
  const follow = useFollow();
  const name = displayName(person);
  const why = person.reasons.map((r) => reasonLabel(r, person.mutualFriends)).join(' · ');
  const fail = (e: unknown) => showToast({ message: socialErrorMessage(e) });
  const open = () =>
    person.username &&
    router.push({ pathname: '/u/[username]', params: { username: person.username } });
  return (
    <View className="w-44 gap-sm rounded-lg border-t border-edge bg-surface p-md">
      <PressableScale
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${name}'s profile${why ? `. ${why}` : ''}`}
        className="items-center gap-xs"
      >
        <Avatar
          name={name}
          uri={person.avatarUrl}
          size="lg"
          ring={person.rank ? { tier: person.rank.tier } : undefined}
        />
        <Text variant="subheading" numberOfLines={1}>
          {name}
        </Text>
        {person.rank ? (
          <RankTag tier={person.rank.tier} division={person.rank.division} />
        ) : (
          <Text variant="label" tone="muted">
            Placing
          </Text>
        )}
        <Text variant="caption" tone="muted" numberOfLines={2} className="min-h-8 text-center">
          {why || [person.college, person.city].filter(Boolean).join(' · ')}
        </Text>
      </PressableScale>
      <Button
        label="Add friend"
        variant="outline"
        size="sm"
        onPress={() =>
          friend.mutate(
            { kind: 'request', userId: person.id },
            { onSuccess: () => showToast({ message: `Request sent to ${name}` }), onError: fail },
          )
        }
        loading={friend.isPending}
        fullWidth
      />
      <Button
        label="Follow"
        variant="ghost"
        size="sm"
        onPress={() =>
          follow.mutate(
            { userId: person.id, follow: true },
            { onSuccess: () => showToast({ message: `Following ${name}` }), onError: fail },
          )
        }
        loading={follow.isPending}
        fullWidth
      />
    </View>
  );
}

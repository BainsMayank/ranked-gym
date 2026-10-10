import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Avatar, PressableScale, RankTag, Text } from '@/components';
import type { Person } from '@/lib/social';

import { displayName } from '../format';

interface PersonRowProps {
  person: Person;
  /** Under the name; defaults to @username. */
  detail?: string;
  trailing?: ReactNode;
  /** Defaults to opening their profile. */
  onPress?: () => void;
}

/** A person in a list: avatar with rank ring, name, a detail line and an optional action. */
export function PersonRow({ person, detail, trailing, onPress }: PersonRowProps) {
  const name = displayName(person);
  const open =
    onPress ??
    (person.username
      ? () =>
          router.push({ pathname: '/u/[username]', params: { username: person.username ?? '' } })
      : undefined);
  return (
    <View className="min-h-14 flex-row items-center gap-md py-xs">
      <PressableScale
        onPress={open}
        disabled={!open}
        accessibilityRole="button"
        accessibilityLabel={onPress ? name : `${name}'s profile`}
        className="flex-1 flex-row items-center gap-md"
      >
        <Avatar
          name={name}
          uri={person.avatarUrl}
          size="md"
          ring={person.rank ? { tier: person.rank.tier } : undefined}
        />
        <View className="flex-1">
          <Text variant="subheading" numberOfLines={1}>
            {name}
          </Text>
          <View className="flex-row items-center gap-xs">
            <Text variant="caption" tone="muted" numberOfLines={1} className="shrink">
              {detail ?? (person.username ? `@${person.username}` : '')}
            </Text>
            {person.rank ? (
              <RankTag tier={person.rank.tier} division={person.rank.division} />
            ) : null}
          </View>
        </View>
      </PressableScale>
      {trailing}
    </View>
  );
}

import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Avatar,
  EmptyState,
  ListGroup,
  ListItem,
  RankTag,
  SectionHeader,
  Skeleton,
} from '@/components';
import { useFriends } from '@/lib/social';

/** Everyone you're friends with, A to Z; tap for their profile. */
export function FriendsListSection() {
  const friends = useFriends();
  const list = friends.data ?? [];
  return (
    <View className="gap-sm">
      <SectionHeader title="Your friends" />
      {friends.isLoading ? <Skeleton height={120} radius="lg" /> : null}
      {friends.isError ? (
        <EmptyState
          title="Friends couldn’t load"
          action={{ label: 'Try again', onPress: () => void friends.refetch() }}
        />
      ) : null}
      {friends.isSuccess && list.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No friends yet"
          description="Find people from your college or city in Discover, then add them."
          action={{ label: 'Open Discover', onPress: () => router.navigate('/home/discover') }}
        />
      ) : null}
      {list.length > 0 ? (
        <ListGroup>
          {list.map((f) => {
            const name = f.displayName ?? (f.username ? `@${f.username}` : 'Lifter');
            return (
              <ListItem
                key={f.id}
                title={name}
                subtitle={f.username ? `@${f.username}` : undefined}
                titleAccessory={
                  f.rank ? <RankTag tier={f.rank.tier} division={f.rank.division} /> : undefined
                }
                leading={
                  <Avatar
                    name={name}
                    uri={f.avatarUrl}
                    size="md"
                    ring={f.rank ? { tier: f.rank.tier } : undefined}
                  />
                }
                onPress={() =>
                  f.username &&
                  router.push({ pathname: '/u/[username]', params: { username: f.username } })
                }
              />
            );
          })}
        </ListGroup>
      ) : null}
    </View>
  );
}

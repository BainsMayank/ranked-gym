import { View } from 'react-native';

import { Screen } from '@/components';
import { useServerReads } from '@/lib/ranks';
import { useFriendRequests, useFriends } from '@/lib/social';

import { AddFriendOptions } from '../components/AddFriendOptions';
import { FriendRequestsSection } from '../components/FriendRequestsSection';
import { FriendsListSection } from '../components/FriendsListSection';
import { InviteCard } from '../components/InviteCard';
import { StandingsSummary } from '../components/StandingsSummary';

/** Friends hub: invite, add friends, standings, requests and your friends. */
export function FriendsScreen() {
  const signedIn = useServerReads();
  const friends = useFriends();
  const requests = useFriendRequests();
  const count = friends.data?.length;
  return (
    <Screen
      title="Friends"
      subtitle={count !== undefined ? `${count} ${count === 1 ? 'friend' : 'friends'}` : undefined}
      scroll
      onRefresh={
        signedIn
          ? () => {
              void friends.refetch();
              void requests.refetch();
            }
          : undefined
      }
      refreshing={friends.isRefetching || requests.isRefetching}
    >
      <View className="gap-lg">
        <InviteCard />
        <AddFriendOptions />
        <StandingsSummary />
        {signedIn ? (
          <>
            <FriendRequestsSection />
            <FriendsListSection />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

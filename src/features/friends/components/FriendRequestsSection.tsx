import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Avatar,
  Button,
  ListGroup,
  ListItem,
  RankTag,
  SectionHeader,
  showToast,
} from '@/components';
import {
  socialErrorMessage,
  useFriendAction,
  useFriendRequests,
  type FriendRequest,
} from '@/lib/social';

const nameOf = (r: FriendRequest) =>
  r.user.displayName ?? (r.user.username ? `@${r.user.username}` : 'Lifter');

function open(r: FriendRequest) {
  if (r.user.username)
    router.push({ pathname: '/u/[username]', params: { username: r.user.username } });
}

/** Incoming requests (Accept / Decline) and the ones you sent (Cancel). Hidden when there are none. */
export function FriendRequestsSection() {
  const requests = useFriendRequests();
  const action = useFriendAction();
  const fail = (e: unknown) => showToast({ message: socialErrorMessage(e) });
  const incoming = requests.data?.incoming ?? [];
  const outgoing = requests.data?.outgoing ?? [];
  if (incoming.length === 0 && outgoing.length === 0) return null;
  return (
    <View className="gap-sm">
      {incoming.length > 0 ? (
        <>
          <SectionHeader title="Requests" count={incoming.length} />
          <ListGroup>
            {incoming.map((r) => (
              <ListItem
                key={r.id}
                title={nameOf(r)}
                subtitle={
                  r.mutualFriends > 0
                    ? `${r.mutualFriends} mutual ${r.mutualFriends === 1 ? 'friend' : 'friends'}`
                    : r.user.username
                      ? `@${r.user.username}`
                      : undefined
                }
                titleAccessory={
                  r.user.rank ? (
                    <RankTag tier={r.user.rank.tier} division={r.user.rank.division} />
                  ) : undefined
                }
                leading={<Avatar name={nameOf(r)} uri={r.user.avatarUrl} size="md" />}
                onPress={() => open(r)}
                trailing={
                  <View className="flex-row items-center gap-xs">
                    <Button
                      label="Accept"
                      variant="outline"
                      size="sm"
                      onPress={() =>
                        action.mutate({ kind: 'accept', requestId: r.id }, { onError: fail })
                      }
                    />
                    <Button
                      label="Decline"
                      variant="secondary"
                      size="sm"
                      accessibilityLabel={`Decline ${nameOf(r)}`}
                      onPress={() =>
                        action.mutate({ kind: 'decline', requestId: r.id }, { onError: fail })
                      }
                    />
                  </View>
                }
              />
            ))}
          </ListGroup>
        </>
      ) : null}
      {outgoing.length > 0 ? (
        <>
          <SectionHeader title="Sent" />
          <ListGroup>
            {outgoing.map((r) => (
              <ListItem
                key={r.id}
                title={nameOf(r)}
                subtitle="Waiting for them to accept"
                leading={<Avatar name={nameOf(r)} uri={r.user.avatarUrl} size="md" />}
                onPress={() => open(r)}
                trailing={
                  <Button
                    label="Cancel"
                    variant="secondary"
                    size="sm"
                    accessibilityLabel={`Cancel request to ${nameOf(r)}`}
                    onPress={() =>
                      action.mutate({ kind: 'cancel', requestId: r.id }, { onError: fail })
                    }
                  />
                }
              />
            ))}
          </ListGroup>
        </>
      ) : null}
    </View>
  );
}

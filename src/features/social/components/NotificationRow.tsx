import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, PressableScale, Text, showToast } from '@/components';
import { socialErrorMessage, useFriendAction, type AppNotification } from '@/lib/social';

import { displayName, timeAgo } from '../format';

function sentence(n: AppNotification): string {
  const preview = n.post?.preview ? `: “${n.post.preview}”` : '';
  switch (n.kind) {
    case 'respect':
      return `gave respect to your post${preview}`;
    case 'comment':
      return `commented: “${n.comment?.preview ?? ''}”`;
    case 'reply':
      return `replied: “${n.comment?.preview ?? ''}”`;
    case 'mention':
      return n.comment
        ? `mentioned you: “${n.comment.preview}”`
        : `mentioned you in a post${preview}`;
    case 'friend_request':
      return n.request?.status === 'accepted' ? 'is now your friend' : 'sent you a friend request';
    case 'friend_accepted':
      return 'accepted your friend request';
    case 'follow':
      return 'started following you';
  }
}

/** One notification: who, what, when; friend requests can be answered in place. */
export function NotificationRow({ item }: { item: AppNotification }) {
  const friend = useFriendAction();
  const name = displayName(item.actor);
  const text = `${name} ${sentence(item)}`;
  const open = () => {
    if (item.post) router.push({ pathname: '/post/[id]', params: { id: item.post.id } });
    else if (item.actor.username)
      router.push({ pathname: '/u/[username]', params: { username: item.actor.username } });
  };
  const pending = item.kind === 'friend_request' && item.request?.status === 'pending';
  const respond = (accept: boolean) =>
    item.request &&
    friend.mutate(
      { kind: accept ? 'accept' : 'decline', requestId: item.request.id },
      { onError: (e) => showToast({ message: socialErrorMessage(e) }) },
    );
  return (
    <View className="flex-row gap-md border-b border-border px-lg py-md">
      <PressableScale
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${item.read ? '' : 'Unread. '}${text}, ${timeAgo(item.createdAt)}`}
        className="flex-1 flex-row gap-md"
      >
        <Avatar
          name={name}
          uri={item.actor.avatarUrl}
          size="md"
          ring={item.actor.rank ? { tier: item.actor.rank.tier } : undefined}
        />
        <View className="flex-1 gap-xxs">
          <Text numberOfLines={3}>
            <Text variant="subheading">{name}</Text> {sentence(item)}
          </Text>
          <Text variant="caption" tone="muted">
            {timeAgo(item.createdAt)}
          </Text>
          {pending ? (
            <View className="flex-row gap-sm pt-xs">
              <Button
                label="Accept"
                variant="outline"
                size="sm"
                onPress={() => respond(true)}
                loading={friend.isPending}
              />
              <Button
                label="Decline"
                variant="secondary"
                size="sm"
                onPress={() => respond(false)}
              />
            </View>
          ) : null}
        </View>
      </PressableScale>
      {item.read ? null : (
        <View accessibilityElementsHidden className="mt-sm h-2 w-2 rounded-full bg-primary" />
      )}
    </View>
  );
}

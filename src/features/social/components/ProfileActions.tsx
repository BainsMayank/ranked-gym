import { Alert, View } from 'react-native';

import { Button, IconButton, showToast } from '@/components';
import {
  socialErrorMessage,
  useBlock,
  useFollow,
  useFriendAction,
  type FriendAction,
  type Profile,
} from '@/lib/social';

import { displayName } from '../format';

/** Add friend / Accept / Requested / Friends, Follow for public profiles, and ⋯ (block). */
export function ProfileActions({ profile }: { profile: Profile }) {
  const friend = useFriendAction();
  const follow = useFollow();
  const block = useBlock();
  const name = displayName(profile);
  const rel = profile.relationship;
  const fail = (e: unknown) => showToast({ message: socialErrorMessage(e) });
  const act = (a: FriendAction, done?: string) =>
    friend.mutate(a, { onSuccess: () => done && showToast({ message: done }), onError: fail });
  const confirm = (title: string, message: string, label: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: 'destructive', onPress: run },
    ]);

  const menu = () =>
    rel.blocked
      ? block.mutate({ userId: profile.id, block: false }, { onError: fail })
      : confirm(
          `Block ${name}?`,
          'You won’t see each other’s posts, profiles or comments. Any friendship or follow between you ends.',
          'Block',
          () => block.mutate({ userId: profile.id, block: true }, { onError: fail }),
        );

  if (rel.blocked) {
    return (
      <Button
        label="Unblock"
        variant="outline"
        onPress={menu}
        loading={block.isPending}
        fullWidth
      />
    );
  }
  const busy = friend.isPending;
  let main;
  switch (rel.friend) {
    case 'none':
      main = (
        <Button
          label="Add friend"
          icon="person-add-outline"
          onPress={() => act({ kind: 'request', userId: profile.id }, 'Friend request sent')}
          loading={busy}
          className="flex-1"
        />
      );
      break;
    case 'incoming':
      main = (
        <>
          <Button
            label="Accept"
            onPress={() =>
              rel.requestId &&
              act({ kind: 'accept', requestId: rel.requestId }, `You and ${name} are friends`)
            }
            loading={busy}
            className="flex-1"
          />
          <Button
            label="Decline"
            variant="ghost"
            onPress={() => rel.requestId && act({ kind: 'decline', requestId: rel.requestId })}
          />
        </>
      );
      break;
    case 'outgoing':
      main = (
        <Button
          label="Requested"
          variant="outline"
          className="flex-1"
          accessibilityHint="Cancels the friend request"
          onPress={() =>
            rel.requestId &&
            confirm('Cancel friend request?', '', 'Cancel request', () =>
              act({ kind: 'cancel', requestId: rel.requestId ?? '' }),
            )
          }
        />
      );
      break;
    case 'friends':
      main = (
        <Button
          label="Friends"
          icon="checkmark"
          variant="outline"
          className="flex-1"
          accessibilityHint="Removes this friend"
          onPress={() =>
            confirm(
              `Remove ${name} as a friend?`,
              'You can add each other again later.',
              'Remove',
              () => act({ kind: 'remove', userId: profile.id }),
            )
          }
        />
      );
      break;
  }
  const canFollow = profile.visibility === 'public' && rel.friend !== 'friends';
  return (
    <View className="flex-row items-center gap-sm">
      {main}
      {canFollow ? (
        <Button
          label={rel.following ? 'Following' : 'Follow'}
          variant={rel.following ? 'outline' : 'secondary'}
          onPress={() =>
            follow.mutate({ userId: profile.id, follow: !rel.following }, { onError: fail })
          }
          loading={follow.isPending}
        />
      ) : null}
      <IconButton
        icon="ellipsis-horizontal"
        variant="surface"
        accessibilityLabel={`More options for ${name}`}
        onPress={menu}
      />
    </View>
  );
}

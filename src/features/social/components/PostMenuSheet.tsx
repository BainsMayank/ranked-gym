import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ListGroup, ListItem, Sheet, showToast } from '@/components';
import { socialErrorMessage, useBlock, useDeletePost, type Post } from '@/lib/social';

import { displayName } from '../format';

interface PostMenuSheetProps {
  post: Post | null;
  onClose: () => void;
  onReport: (post: Post) => void;
}

/** Edit or delete my post; report a post or block its author otherwise. */
export function PostMenuSheet({ post, onClose, onReport }: PostMenuSheetProps) {
  const remove = useDeletePost();
  const block = useBlock();
  if (!post)
    return (
      <Sheet visible={false} onClose={onClose}>
        {null}
      </Sheet>
    );
  const name = displayName(post.author);

  const confirmDelete = () => {
    onClose();
    Alert.alert('Delete this post?', 'Its respects and comments go with it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(post.id, {
            onSuccess: () => {
              if (router.canGoBack()) router.back();
            },
            onError: (e) => showToast({ message: socialErrorMessage(e) }),
          }),
      },
    ]);
  };
  const confirmBlock = () => {
    onClose();
    Alert.alert(
      `Block ${name}?`,
      'You won’t see each other’s posts, profiles or comments. Any friendship or follow between you ends.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            block.mutate(
              { userId: post.author.id, block: true },
              {
                onSuccess: () => showToast({ message: `${name} is blocked.` }),
                onError: (e) => showToast({ message: socialErrorMessage(e) }),
              },
            ),
        },
      ],
    );
  };

  return (
    <Sheet visible onClose={onClose} title="Post">
      <ListGroup>
        {post.mine ? (
          <>
            <ListItem
              title="Edit post"
              subtitle={post.type === 'workout' ? 'Caption and who can see it' : undefined}
              onPress={() => {
                onClose();
                router.push({ pathname: '/post/new', params: { edit: post.id } });
              }}
            />
            <ListItem title="Delete post" onPress={confirmDelete} />
          </>
        ) : (
          <>
            <ListItem
              title="Report post"
              onPress={() => {
                onClose();
                onReport(post);
              }}
            />
            <ListItem title={`Block ${name}`} onPress={confirmBlock} />
          </>
        )}
      </ListGroup>
    </Sheet>
  );
}

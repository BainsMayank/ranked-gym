import { View } from 'react-native';

import { Card, Icon, Text } from '@/components';

import type { FeedItem } from '../mocks';
import { PostActions } from './PostActions';
import { PostHeader } from './PostHeader';

type MediaPost = Extract<FeedItem, { kind: 'media' }>;

export function MediaPostCard({ post }: { post: MediaPost }) {
  return (
    <Card className="gap-md">
      <PostHeader author={post.author} meta={post.meta} />
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="Photo or video"
        className="aspect-[4/3] items-center justify-center rounded-md bg-surface-raised"
      >
        <Icon name="image-outline" size={32} tone="textMuted" />
      </View>
      <Text>{post.caption}</Text>
      <PostActions likes={post.likes} comments={post.comments} />
    </Card>
  );
}

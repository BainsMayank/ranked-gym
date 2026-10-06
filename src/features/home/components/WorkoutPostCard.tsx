import { View } from 'react-native';

import { Card, Icon, ListGroup, Stat, Text } from '@/components';
import { rankColors } from '@/theme';

import type { FeedItem } from '../mocks';
import { PostActions } from './PostActions';
import { PostHeader } from './PostHeader';

type WorkoutPost = Extract<FeedItem, { kind: 'workout' }>;

/** A shared workout: summary numbers, the lifts, and any rank-up it earned. */
export function WorkoutPostCard({ post }: { post: WorkoutPost }) {
  return (
    <Card className="gap-md">
      <PostHeader author={post.author} meta={post.meta} />
      <View className="gap-xxs">
        <Text variant="heading">{post.title}</Text>
        <Text tone="muted">{post.caption}</Text>
      </View>
      <View className="flex-row">
        <Stat label="Duration" value={post.stats.duration} className="flex-1" />
        <Stat label="Volume" value={post.stats.volume} className="flex-1" />
        <Stat label="Records" value={post.stats.records} valueTone="warning" className="flex-1" />
      </View>
      <ListGroup className="bg-surface-raised">
        {post.exercises.map((e) => (
          <View key={e.name} className="flex-row items-center justify-between px-lg py-sm">
            <Text variant="label">{e.name}</Text>
            <Text variant="label" tone="muted" numeric>
              {e.detail}
              {e.pr ? (
                <Text variant="label" tone="warning">
                  {' '}
                  PR
                </Text>
              ) : null}
            </Text>
          </View>
        ))}
      </ListGroup>
      {post.rankUp ? (
        <View className="flex-row items-center gap-sm">
          <Icon name="chevron-up-circle" size={18} color={rankColors[post.rankUp.tier].base} />
          <Text variant="label" style={{ color: rankColors[post.rankUp.tier].base }}>
            Rank up · {post.rankUp.text}
          </Text>
        </View>
      ) : null}
      <PostActions likes={post.likes} comments={post.comments} canCopy />
    </Card>
  );
}

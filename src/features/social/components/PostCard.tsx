import { router } from 'expo-router';
import { memo } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Card, PressableScale } from '@/components';
import { POST_MEDIA_BUCKET, WORKOUT_PHOTO_BUCKET, type Post } from '@/lib/social';
import type { WeightUnit } from '@/lib/units';
import { spacing } from '@/theme';

import { AttachedPrCard, AttachedWorkoutCard } from './AttachedCards';
import { MentionText } from './MentionText';
import { GoalBody, LeagueBody, PrBody, RankUpBody } from './MilestoneBodies';
import { PhotoPager } from './PhotoPager';
import { PostActions } from './PostActions';
import { PostAuthorRow } from './PostAuthorRow';
import { WorkoutPostBody } from './WorkoutPostBody';

interface PostCardProps {
  post: Post;
  unit: WeightUnit;
  onMenu: (post: Post) => void;
  /** On the post's own screen the body isn't a link and Comment focuses the reply box. */
  standalone?: boolean;
  onComment?: () => void;
}

function Milestone({ post, unit }: { post: Post; unit: WeightUnit }) {
  switch (post.type) {
    case 'pr':
      return <PrBody pr={post.pr} unit={unit} />;
    case 'rank_up':
      return <RankUpBody rankUp={post.rankUp} />;
    case 'goal':
      return <GoalBody goal={post.goal} />;
    case 'league_result':
      return <LeagueBody league={post.league} />;
    default:
      return null;
  }
}

function Body({ post, unit, width }: { post: Post; unit: WeightUnit; width: number }) {
  const caption = post.body ? <MentionText variant="body">{post.body}</MentionText> : null;
  if (post.type === 'workout') {
    const photo = post.workout.photoPath;
    return (
      <View className="gap-md">
        {caption}
        <WorkoutPostBody workout={post.workout} unit={unit} />
        {photo ? (
          <PhotoPager
            bucket={WORKOUT_PHOTO_BUCKET}
            media={[{ path: photo, w: 4, h: 5 }]}
            width={width}
            label={`Photo from ${post.workout.name}`}
          />
        ) : null}
      </View>
    );
  }
  if (post.type === 'text' || post.type === 'photo') {
    return (
      <View className="gap-md">
        {caption}
        <PhotoPager
          bucket={POST_MEDIA_BUCKET}
          media={post.media}
          width={width}
          label="Post photo"
        />
        {post.attachedWorkout ? (
          <AttachedWorkoutCard workout={post.attachedWorkout} unit={unit} />
        ) : null}
        {post.attachedPr ? <AttachedPrCard pr={post.attachedPr} unit={unit} /> : null}
      </View>
    );
  }
  return (
    <View className="gap-md">
      {caption}
      <Card raised className="gap-md">
        <Milestone post={post} unit={unit} />
      </Card>
    </View>
  );
}

/** One post in a list: full width, separated by hairlines (milestones sit in a raised card). */
export const PostCard = memo(function PostCard({
  post,
  unit,
  onMenu,
  standalone,
  onComment,
}: PostCardProps) {
  const { width } = useWindowDimensions();
  const contentWidth = width - spacing.lg * 2;
  const open = () => router.push({ pathname: '/post/[id]', params: { id: post.id } });
  const canCopy = post.type === 'workout' && !post.mine;
  return (
    <View className="gap-md border-b border-border px-lg py-lg">
      <PostAuthorRow
        author={post.author}
        createdAt={post.createdAt}
        visibility={post.visibility}
        edited={!!post.editedAt}
        onMenu={() => onMenu(post)}
      />
      {standalone ? (
        <Body post={post} unit={unit} width={contentWidth} />
      ) : (
        <PressableScale onPress={open} accessibilityRole="button" accessibilityLabel="Open post">
          <Body post={post} unit={unit} width={contentWidth} />
        </PressableScale>
      )}
      <PostActions
        post={post}
        onComment={
          onComment ??
          (() => router.push({ pathname: '/post/[id]', params: { id: post.id, reply: '1' } }))
        }
        onCopy={
          canCopy
            ? () => router.push({ pathname: '/post/[id]/copy', params: { id: post.id } })
            : undefined
        }
      />
    </View>
  );
});

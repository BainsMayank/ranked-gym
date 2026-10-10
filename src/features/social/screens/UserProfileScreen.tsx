import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { EmptyState, Screen, Skeleton } from '@/components';
import { useProfile } from '@/lib/profile';
import { useServerReads } from '@/lib/ranks';
import { usePublicProfile, useUserPosts } from '@/lib/social';
import { spacing } from '@/theme';

import { PostSkeletons } from '../components/FeedBits';
import { PostCard } from '../components/PostCard';
import { ProfileHeader } from '../components/ProfileHeader';
import { SignedOutSocial } from '../components/SocialStates';
import { usePostMenu } from '../usePostMenu';

/** Another lifter (or me, as others see me): profile, relationship actions and posts. */
export function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const signedIn = useServerReads();
  const profile = usePublicProfile(username);
  const data = profile.data;
  const showPosts = !!data && !data.relationship.blocked;
  const posts = useUserPosts(showPosts ? data.id : undefined);
  const unit = useProfile().data?.units ?? 'kg';
  const menu = usePostMenu();
  const list = useMemo(() => posts.data?.pages.flatMap((p) => p.posts) ?? [], [posts.data]);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home/feed'));
  const title = username ? `@${username}` : 'Profile';

  if (!signedIn) {
    return (
      <Screen title={title} onBack={back} scroll>
        <SignedOutSocial what="profiles" />
      </Screen>
    );
  }
  if (profile.isLoading) {
    return (
      <Screen title={title} onBack={back} scroll>
        <Skeleton height={160} radius="lg" />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title={title} onBack={back} scroll>
        <EmptyState
          icon="person-outline"
          title={profile.isError ? 'This profile couldn’t load' : 'This profile isn’t available'}
          description={profile.isError ? 'Check your connection and try again.' : undefined}
          action={
            profile.isError
              ? { label: 'Try again', onPress: () => void profile.refetch() }
              : undefined
          }
        />
      </Screen>
    );
  }

  const close = data.relationship.me || data.relationship.friend === 'friends';
  const empty =
    showPosts && posts.isSuccess && list.length === 0 && data.canView ? (
      <EmptyState
        icon="barbell-outline"
        title={close ? 'No posts yet' : 'Nothing shared with you yet'}
        description={
          close
            ? 'Workouts they share show here.'
            : 'Public posts show here. Friends also see their friends-only posts.'
        }
      />
    ) : null;
  return (
    <Screen title={title} onBack={back} padded={false}>
      <FlashList
        data={list}
        keyExtractor={(p) => p.id}
        getItemType={(p) => p.type}
        renderItem={({ item }) => <PostCard post={item} unit={unit} onMenu={menu.open} />}
        ListHeaderComponent={
          <View>
            <ProfileHeader profile={data} />
            <View className="border-b border-border" />
            {posts.isLoading ? <PostSkeletons count={2} /> : null}
            {empty}
          </View>
        }
        onEndReached={() => {
          if (posts.hasNextPage && !posts.isFetchingNextPage) void posts.fetchNextPage();
        }}
        refreshing={posts.isRefetching || profile.isRefetching}
        onRefresh={() => {
          void profile.refetch();
          void posts.refetch();
        }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      />
      {menu.sheets}
    </Screen>
  );
}

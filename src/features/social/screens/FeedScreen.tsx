import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { EmptyState, Screen, useTabBarInset } from '@/components';
import { useUserId } from '@/lib/auth/authStore';
import { useProfile } from '@/lib/profile';
import { useServerReads } from '@/lib/ranks';
import {
  caughtUpIndex,
  cursorOf,
  loadSeen,
  saveSeen,
  useFeed,
  useNewPostsSignal,
  type Post,
} from '@/lib/social';
import { useSyncStatusStore } from '@/lib/sync/status';
import { spacing } from '@/theme';

import {
  CaughtUpDivider,
  ComposerPrompt,
  NewPostsPill,
  PostSkeletons,
} from '../components/FeedBits';
import { PostCard } from '../components/PostCard';
import { OfflineNotice, SignedOutSocial } from '../components/SocialStates';
import { usePostMenu } from '../usePostMenu';

type Row = { kind: 'post'; post: Post } | { kind: 'caughtUp' };

/** Home → Feed: friends, people you follow and you, newest first. */
export function FeedScreen() {
  const signedIn = useServerReads();
  const userId = useUserId();
  const feed = useFeed();
  const profile = useProfile().data;
  const unit = profile?.units ?? 'kg';
  const online = useSyncStatusStore((s) => s.online);
  const bottom = useTabBarInset();
  const menu = usePostMenu();
  const list = useRef<FlashListRef<Row>>(null);
  const { hasNew, reset } = useNewPostsSignal();
  // Where "caught up" sits is fixed for this visit; leaving the Feed remembers the newest post.
  const [seen] = useState(() => (userId ? loadSeen(userId) : null));
  const posts = useMemo(() => feed.data?.pages.flatMap((p) => p.posts) ?? [], [feed.data]);
  const top = posts[0];
  useFocusEffect(
    useCallback(
      () => () => {
        if (userId && top) saveSeen(userId, cursorOf(top));
      },
      [userId, top],
    ),
  );

  const rows = useMemo<Row[]>(() => {
    const marker = caughtUpIndex(posts, seen);
    const out: Row[] = posts.map((post) => ({ kind: 'post', post }));
    if (marker > 0) out.splice(marker, 0, { kind: 'caughtUp' });
    return out;
  }, [posts, seen]);

  if (!signedIn) {
    return (
      <Screen edges={[]} scroll className="pt-sm">
        <SignedOutSocial what="your feed" />
      </Screen>
    );
  }

  const showNew = () => {
    reset();
    list.current?.scrollToOffset({ offset: 0, animated: true });
    void feed.refetch();
  };

  const header = (
    <View className="gap-sm pb-xs">
      <ComposerPrompt
        name={profile?.display_name ?? profile?.username ?? 'You'}
        avatarUrl={profile?.avatar_url ?? null}
      />
      {!online ? <OfflineNotice /> : null}
      {feed.isLoading ? <PostSkeletons /> : null}
      {feed.isError && posts.length === 0 ? (
        <EmptyState
          title="The feed couldn’t load"
          description="Check your connection and try again."
          action={{ label: 'Try again', onPress: () => void feed.refetch() }}
        />
      ) : null}
      {feed.isSuccess && posts.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Your feed is quiet"
          description="Add friends or follow people you meet in Discover. Your own workouts show here too."
          action={{
            label: 'Find people in Discover',
            onPress: () => router.navigate('/home/discover'),
          }}
        />
      ) : null}
    </View>
  );

  return (
    <Screen edges={[]} padded={false} bleedBottom>
      <FlashList
        ref={list}
        data={rows}
        keyExtractor={(r) => (r.kind === 'post' ? r.post.id : 'caught-up')}
        getItemType={(r) => (r.kind === 'post' ? r.post.type : r.kind)}
        renderItem={({ item }) =>
          item.kind === 'post' ? (
            <PostCard post={item.post} unit={unit} onMenu={menu.open} />
          ) : (
            <CaughtUpDivider />
          )
        }
        ListHeaderComponent={header}
        ListFooterComponent={feed.isFetchingNextPage ? <PostSkeletons count={1} /> : null}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => {
          reset();
          void feed.refetch();
        }}
        contentContainerStyle={{ paddingBottom: bottom + spacing.lg }}
      />
      {hasNew ? <NewPostsPill onPress={showNew} /> : null}
      {menu.sheets}
    </Screen>
  );
}

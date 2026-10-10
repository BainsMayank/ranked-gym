import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { Button, EmptyState, Screen } from '@/components';
import { useServerReads } from '@/lib/ranks';
import { useMarkNotificationsRead, useNotifications } from '@/lib/social';
import { spacing } from '@/theme';

import { NotificationRow } from '../components/NotificationRow';
import { PostSkeletons } from '../components/FeedBits';
import { SignedOutSocial } from '../components/SocialStates';

/** Respects, comments, mentions, friend requests and follows. Opening the list marks them read. */
export function NotificationsScreen() {
  const signedIn = useServerReads();
  const list = useNotifications();
  const markRead = useMarkNotificationsRead();
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const unread = items.some((n) => !n.read);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  // Leaving the screen marks everything read, so the dots stay visible while you look.
  useFocusEffect(
    useCallback(
      () => () => {
        if (unread) markRead.mutate(undefined);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [unread],
    ),
  );

  if (!signedIn) {
    return (
      <Screen title="Notifications" onBack={back} scroll>
        <SignedOutSocial what="notifications" />
      </Screen>
    );
  }
  return (
    <Screen
      title="Notifications"
      onBack={back}
      padded={false}
      headerRight={
        unread ? (
          <Button
            label="Mark all read"
            variant="ghost"
            size="sm"
            onPress={() => markRead.mutate(undefined)}
          />
        ) : undefined
      }
    >
      <FlashList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotificationRow item={item} />}
        ListHeaderComponent={list.isLoading ? <PostSkeletons count={2} /> : null}
        ListEmptyComponent={
          list.isError ? (
            <EmptyState
              title="Notifications couldn’t load"
              action={{ label: 'Try again', onPress: () => void list.refetch() }}
            />
          ) : list.isSuccess ? (
            <EmptyState
              icon="notifications-outline"
              title="Nothing yet"
              description="Respects, comments, mentions and friend requests show here."
            />
          ) : null
        }
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      />
    </Screen>
  );
}

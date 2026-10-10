import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip, EmptyState, Screen, SearchField, Text, useTabBarInset } from '@/components';
import { useProfile } from '@/lib/profile';
import { useServerReads } from '@/lib/ranks';
import { discoverFilters, useDiscover, type DiscoverFilter } from '@/lib/social';
import { useSyncStatusStore } from '@/lib/sync/status';
import { spacing } from '@/theme';

import { PostSkeletons } from '../components/FeedBits';
import { PeopleCarousel } from '../components/PeopleCarousel';
import { PeopleSearchResults } from '../components/PeopleSearchResults';
import { PostCard } from '../components/PostCard';
import { OfflineNotice, SignedOutSocial } from '../components/SocialStates';
import { reasonLabel } from '../format';
import { usePostMenu } from '../usePostMenu';

const filterLabels: Record<DiscoverFilter, string> = {
  college: 'My college',
  city: 'My city',
  similar_rank: 'Similar rank',
  same_goal: 'Same goal',
  calisthenics: 'Calisthenics',
  beginners: 'Beginners',
};

/** Home → Discover: public posts from people you don't know yet, leaning towards people like you. */
export function DiscoverScreen() {
  const signedIn = useServerReads();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<DiscoverFilter[]>([]);
  const discover = useDiscover(filters);
  const unit = useProfile().data?.units ?? 'kg';
  const online = useSyncStatusStore((s) => s.online);
  const bottom = useTabBarInset();
  const menu = usePostMenu();
  const posts = useMemo(() => discover.data?.pages.flatMap((p) => p.posts) ?? [], [discover.data]);
  const searching = query.trim().length > 0;

  if (!signedIn) {
    return (
      <Screen edges={[]} scroll className="pt-sm">
        <SignedOutSocial what="Discover" />
      </Screen>
    );
  }

  const toggle = (f: DiscoverFilter) =>
    setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const header = (
    <View className="gap-sm pt-sm">
      <View className="px-lg">
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search people by name or @username"
        />
      </View>
      {!online ? <OfflineNotice /> : null}
      {searching ? (
        <PeopleSearchResults query={query.trim()} />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-sm px-lg"
            accessibilityLabel="Filters"
          >
            {discoverFilters.map((f) => (
              <Chip
                key={f}
                label={filterLabels[f]}
                selected={filters.includes(f)}
                onPress={() => toggle(f)}
              />
            ))}
          </ScrollView>
          {filters.length === 0 ? <PeopleCarousel /> : null}
          {discover.isLoading ? <PostSkeletons /> : null}
          {discover.isError && posts.length === 0 ? (
            <EmptyState
              title="Discover couldn’t load"
              description="Check your connection and try again."
              action={{ label: 'Try again', onPress: () => void discover.refetch() }}
            />
          ) : null}
          {discover.isSuccess && posts.length === 0 ? (
            <EmptyState
              icon="compass-outline"
              title={filters.length ? 'Nothing matches those filters' : 'Nothing new right now'}
              description={
                filters.length
                  ? 'Try fewer filters. Discover shows public posts from the last two weeks.'
                  : 'Public posts from people you don’t follow yet show here.'
              }
            />
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <Screen edges={[]} padded={false} bleedBottom>
      <FlashList
        data={searching ? [] : posts}
        keyExtractor={(p) => p.id}
        getItemType={(p) => p.type}
        renderItem={({ item }) => (
          <View>
            {item.reasons.length > 0 ? (
              <Text variant="overline" tone="muted" className="px-lg pt-md">
                {item.reasons.map((r) => reasonLabel(r)).join(' · ')}
              </Text>
            ) : null}
            <PostCard post={item} unit={unit} onMenu={menu.open} />
          </View>
        )}
        ListHeaderComponent={header}
        ListFooterComponent={discover.isFetchingNextPage ? <PostSkeletons count={1} /> : null}
        onEndReached={() => {
          if (!searching && discover.hasNextPage && !discover.isFetchingNextPage)
            void discover.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshing={discover.isRefetching && !discover.isFetchingNextPage}
        onRefresh={() => void discover.refetch()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottom + spacing.lg }}
      />
      {menu.sheets}
    </Screen>
  );
}

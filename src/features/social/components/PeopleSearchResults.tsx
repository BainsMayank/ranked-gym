import { View } from 'react-native';

import { EmptyState, Skeleton } from '@/components';
import { useProfileSearch } from '@/lib/social';
import { useDebouncedValue } from '@/lib/utils';

import { PersonRow } from './PersonRow';

/** People matching a Discover search, friends first. */
export function PeopleSearchResults({ query }: { query: string }) {
  const debounced = useDebouncedValue(query, 250);
  const results = useProfileSearch(debounced);
  if (results.isLoading || debounced !== query) {
    return (
      <View className="gap-sm px-lg">
        <Skeleton height={56} radius="md" />
        <Skeleton height={56} radius="md" />
      </View>
    );
  }
  if (!results.data?.length) {
    return (
      <EmptyState
        icon="search"
        title="No one found"
        description="Try their username or another spelling."
      />
    );
  }
  return (
    <View className="px-lg">
      {results.data.map((p) => (
        <PersonRow
          key={p.id}
          person={p}
          detail={p.isFriend ? `@${p.username ?? ''} · friend` : undefined}
        />
      ))}
    </View>
  );
}

import { View } from 'react-native';

import { useDebouncedValue } from '@/lib/utils';
import { useProfileSearch, type SearchResult } from '@/lib/social';

import { PersonRow } from './PersonRow';

/** People matching the @mention being typed (friends first). Hidden until there's a match. */
export function MentionSuggestions({
  query,
  onPick,
}: {
  query: string;
  onPick: (person: SearchResult) => void;
}) {
  const debounced = useDebouncedValue(query, 200);
  const results = useProfileSearch(debounced);
  const people = (results.data ?? []).filter((p) => p.username).slice(0, 4);
  if (query.length === 0 || people.length === 0) return null;
  return (
    <View
      accessibilityLabel="Mention suggestions"
      className="rounded-md border-t border-edge bg-surface-raised px-md"
    >
      {people.map((p) => (
        <PersonRow
          key={p.id}
          person={p}
          detail={p.isFriend ? `@${p.username} · friend` : `@${p.username}`}
          onPress={() => onPick(p)}
        />
      ))}
    </View>
  );
}

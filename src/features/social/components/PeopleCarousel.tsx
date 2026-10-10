import { ScrollView, View } from 'react-native';

import { SectionHeader, Skeleton, Text } from '@/components';
import { useSuggestions } from '@/lib/social';

import { PersonCard } from './PersonCard';

/** "People to train with": up to 12 suggestions, swiped sideways. */
export function PeopleCarousel() {
  const people = useSuggestions();
  if (people.isSuccess && people.data.length === 0) return null;
  return (
    <View className="gap-sm py-md">
      <SectionHeader title="People to train with" className="px-lg" />
      {people.isLoading ? (
        <View className="flex-row gap-md px-lg">
          <Skeleton width={176} height={236} radius="lg" />
          <Skeleton width={176} height={236} radius="lg" />
        </View>
      ) : people.isError ? (
        <Text variant="caption" tone="muted" className="px-lg">
          Suggestions couldn’t load.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-md px-lg"
          accessibilityLabel="People to train with"
        >
          {(people.data ?? []).map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

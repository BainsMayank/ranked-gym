import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  Avatar,
  Button,
  Chip,
  ListGroup,
  ListItem,
  Screen,
  SearchField,
  SectionHeader,
} from '@/components';

import { ChallengeCard } from '../components/ChallengeCard';
import { PartnerCard } from '../components/PartnerCard';
import { communities, discoverFilters, openChallenge, partners } from '../mocks';

/** Home → Discover: search, training partners, communities and open challenges. */
export function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof discoverFilters)[number]>('Same college');

  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search people, communities, routines"
        />
        <View className="flex-row flex-wrap gap-sm">
          {discoverFilters.map((f) => (
            <Chip key={f} label={f} selected={f === filter} onPress={() => setFilter(f)} />
          ))}
        </View>

        <SectionHeader
          title="Training partners for you"
          action={{ label: 'See all', onPress: () => undefined }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-lg"
          contentContainerClassName="gap-sm px-lg"
        >
          {partners.map((p) => (
            <PartnerCard key={p.name} {...p} />
          ))}
        </ScrollView>

        <SectionHeader title="Communities" />
        <ListGroup>
          {communities.map((c) => (
            <ListItem
              key={c.name}
              title={c.name}
              subtitle={c.meta}
              leading={<Avatar name={c.name} size="md" />}
              trailing={
                <Button label="Join" variant="outline" size="sm" onPress={() => undefined} />
              }
            />
          ))}
        </ListGroup>

        <SectionHeader title="Open challenges" />
        <ChallengeCard
          title={openChallenge.title}
          status={openChallenge.startsIn}
          meta={openChallenge.meta}
        />
      </View>
    </Screen>
  );
}

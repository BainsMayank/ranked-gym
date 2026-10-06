import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import {
  Avatar,
  Button,
  Chip,
  Icon,
  ListGroup,
  ListItem,
  Screen,
  SectionHeader,
} from '@/components';
import { useTheme } from '@/theme';

import { ChallengeCard } from '../components/ChallengeCard';
import { PartnerCard } from '../components/PartnerCard';
import { communities, discoverFilters, openChallenge, partners } from '../mocks';

/** Home → Discover: search, training partners, communities and open challenges. */
export function DiscoverScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<(typeof discoverFilters)[number]>('Same college');

  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        <View className="min-h-12 flex-row items-center gap-sm rounded-md bg-surface px-md">
          <Icon name="search" size={18} tone="textMuted" />
          <TextInput
            accessibilityLabel="Search people, communities, routines"
            placeholder="Search people, communities, routines"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            className="flex-1 py-sm text-body text-text"
          />
        </View>
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

import { View } from 'react-native';

import { Button, ListGroup, ListItem, Screen, SectionHeader } from '@/components';

import { ClashCard } from '../components/ClashCard';
import { LeagueHeroCard } from '../components/LeagueHeroCard';
import { StandingsList } from '../components/StandingsList';
import { events } from '../mocks';

/** Rank → Leagues: your weekly league, standings, college clash and open events. */
export function LeaguesScreen() {
  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        <LeagueHeroCard />
        <StandingsList />
        <SectionHeader title="College clash" meta="Community vs community" />
        <ClashCard />
        <ListGroup>
          {events.map((e) => (
            <ListItem
              key={e.title}
              title={e.title}
              subtitle={e.meta}
              trailing={
                <Button
                  label={e.action}
                  variant={e.game ? 'accent' : 'secondary'}
                  size="sm"
                  onPress={() => undefined}
                />
              }
            />
          ))}
        </ListGroup>
      </View>
    </Screen>
  );
}

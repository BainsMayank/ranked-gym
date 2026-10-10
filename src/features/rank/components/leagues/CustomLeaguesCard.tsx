import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, ListGroup, ListItem, SectionHeader, Text } from '@/components';
import type { CustomLeagueSummary } from '@/lib/leagues';

import { SCORING_LABELS } from './leagueCopy';

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

/** Friend leagues I'm in, plus create and join. */
export function CustomLeaguesCard({ leagues }: { leagues: readonly CustomLeagueSummary[] }) {
  return (
    <View className="gap-sm">
      <SectionHeader
        title="Leagues with friends"
        meta={leagues.length ? `${leagues.length} running` : undefined}
      />
      {leagues.length ? (
        <ListGroup>
          {leagues.map((l) => (
            <ListItem
              key={l.id}
              title={l.name}
              subtitle={`${SCORING_LABELS[l.scoring].title} · ${l.members} members · ends ${DATE.format(new Date(l.endsAt))}`}
              value={l.position ? `#${l.position}` : undefined}
              onPress={() => router.push({ pathname: '/leagues/[id]', params: { id: l.id } })}
            />
          ))}
        </ListGroup>
      ) : (
        <Text tone="muted">
          Start a league for your hostel, batch or gym crew, and score it by effort, attendance or
          one lift.
        </Text>
      )}
      <View className="flex-row gap-sm">
        <Button
          label="Create league"
          variant="outline"
          className="flex-1"
          onPress={() => router.push('/leagues/new')}
        />
        <Button
          label="Join with code"
          variant="outline"
          className="flex-1"
          onPress={() => router.push('/leagues/join')}
        />
      </View>
    </View>
  );
}

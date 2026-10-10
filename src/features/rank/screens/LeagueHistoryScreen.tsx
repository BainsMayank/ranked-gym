import { router } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, LeagueBadge, ListGroup, ListItem, Screen, Skeleton, Tag } from '@/components';
import { useLeagueHistory, type LeagueHistoryItem } from '@/lib/leagues';

import { divisionName, pointsText } from '../components/leagues/leagueCopy';

const OUTCOME = {
  promoted: { label: 'Promoted', tone: 'success' },
  demoted: { label: 'Demoted', tone: 'warning' },
  stayed: { label: 'Stayed', tone: 'neutral' },
} as const;

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function title(h: LeagueHistoryItem): string {
  if (h.kind === 'ranked' && h.division)
    return `${divisionName(h.division)} · season ${h.seasonNumber} week ${h.weekNo}`;
  return h.name;
}

/** Every finished league, newest first, with season recaps. */
export function LeagueHistoryScreen() {
  const history = useLeagueHistory();
  const seasons = [
    ...new Map((history.data ?? []).filter((h) => h.seasonId).map((h) => [h.seasonId, h])).values(),
  ];

  return (
    <Screen title="League history" onBack={() => router.back()} scroll>
      {history.isLoading ? <Skeleton height={300} radius="lg" /> : null}
      {history.data?.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No finished leagues yet"
          description="Your first weekly result lands on Monday."
        />
      ) : null}
      <View className="gap-lg">
        {seasons.length ? (
          <ListGroup>
            {seasons.map((h) => (
              <ListItem
                key={h.seasonId}
                title={`Season ${h.seasonNumber} recap`}
                onPress={() =>
                  router.push({
                    pathname: '/leagues/season/[id]',
                    params: { id: String(h.seasonId) },
                  })
                }
              />
            ))}
          </ListGroup>
        ) : null}
        {history.data?.length ? (
          <ListGroup>
            {history.data.map((h) => (
              <ListItem
                key={h.leagueId}
                title={title(h)}
                subtitle={`#${h.position ?? '—'} of ${h.members} · ${pointsText(h.points, h.scoring)} · ${DATE.format(new Date(h.endsAt))}`}
                leading={h.division ? <LeagueBadge division={h.division} size={36} /> : undefined}
                trailing={
                  h.outcome ? (
                    <Tag label={OUTCOME[h.outcome].label} tone={OUTCOME[h.outcome].tone} />
                  ) : undefined
                }
                onPress={() =>
                  router.push({ pathname: '/leagues/[id]', params: { id: h.leagueId } })
                }
              />
            ))}
          </ListGroup>
        ) : null}
      </View>
    </Screen>
  );
}

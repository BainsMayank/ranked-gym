import { View } from 'react-native';

import { LeagueBadge, RankGlow, Stat, Text } from '@/components';
import { leagueTier } from '@/components/game/artRegistry';
import { countdown, type LeagueHome } from '@/lib/leagues';
import { rankColors } from '@/theme';

import { useNow } from '../../hooks/useNow';
import { divisionName } from './leagueCopy';

/** This week's group: division, week of the season, a live countdown, position, LP and the cut-off. */
export function LeagueHeroCard({ home }: { home: LeagueHome }) {
  const now = useNow();
  const league = home.league;
  const division = league?.division ?? home.division;
  const tier = leagueTier[division];
  const meta = [
    home.season && home.week
      ? `Season ${home.season.number} · week ${home.week.weekNo} of 8`
      : null,
    home.week ? `ends in ${countdown(home.week.endsAt, now)}` : null,
    league ? `${league.members} lifters` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="relative gap-lg overflow-hidden rounded-lg border-t border-edge bg-surface p-lg">
      <RankGlow tier={tier} />
      <View className="flex-row items-center gap-md">
        <LeagueBadge division={division} size={80} />
        <View className="flex-1 gap-xxs">
          <Text variant="title" style={{ color: rankColors[tier].base }}>
            {divisionName(division)} league
          </Text>
          <Text variant="caption" tone="muted" numeric>
            {meta}
          </Text>
        </View>
      </View>
      {league ? (
        <View className="flex-row gap-sm">
          <Stat
            label="Position"
            value={league.position ? `#${league.position}` : '—'}
            boxed
            center
            className="flex-1"
          />
          <Stat
            label="League Points"
            value={String(league.points ?? 0)}
            boxed
            center
            className="flex-1"
          />
          <Stat
            label={division === 'legend' ? 'Top league' : 'Promote'}
            value={division === 'legend' ? 'Hold on' : `Top ${league.promote}`}
            valueTone="success"
            boxed
            center
            className="flex-1"
          />
        </View>
      ) : null}
    </View>
  );
}

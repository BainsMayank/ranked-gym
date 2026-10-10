import { Fragment } from 'react';
import { View } from 'react-native';

import { LeaderboardRow } from '@/components';
import type { LeagueStandings } from '@/lib/leagues';

import { pointsText } from './leagueCopy';
import { ZoneDivider } from './ZoneDivider';

/** A league table with the promotion and demotion cut-offs drawn in. */
export function StandingsList({ standings }: { standings: LeagueStandings }) {
  const demoteFrom = standings.members - standings.demote + 1;
  return (
    <View className="overflow-hidden rounded-lg border-t border-edge bg-surface py-xs">
      {standings.rows.map((row) => (
        <Fragment key={row.userId}>
          {standings.demote > 0 && row.position === demoteFrom ? (
            <ZoneDivider kind="demotion" />
          ) : null}
          <LeaderboardRow
            position={row.position}
            name={row.displayName}
            score={pointsText(row.points, standings.scoring)}
            isYou={row.isYou}
          />
          {standings.promote > 0 && row.position === standings.promote ? (
            <ZoneDivider kind="promotion" />
          ) : null}
        </Fragment>
      ))}
    </View>
  );
}

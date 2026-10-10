import { useRouter } from 'expo-router';

import { Chip } from '@/components';
import { useLeagueHome } from '@/lib/leagues';
import { useServerReads } from '@/lib/ranks';

const name = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);

/** This week's league position for the Today card (hidden without an account). */
export function LeagueStandingChip() {
  const router = useRouter();
  const signedIn = useServerReads();
  const { data } = useLeagueHome();
  if (!signedIn || !data) return null;
  const league = data.league;
  const label = league
    ? `${name(league.division)} · #${league.position ?? '—'} of ${league.members}`
    : 'Join this week’s league';
  return (
    <Chip
      label={label}
      icon="trophy-outline"
      accessibilityLabel={
        league ? `League: ${label}. Open leagues` : 'Finish a workout to join this week’s league'
      }
      onPress={() => router.push('/rank/leagues')}
    />
  );
}

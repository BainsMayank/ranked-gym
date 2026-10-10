import { Tag } from '@/components';
import { daysLeft, useLeagueHome } from '@/lib/leagues';

/** Current league season and days left, for the Rank header. */
export function SeasonTag() {
  const { data } = useLeagueHome();
  if (!data?.season) return null;
  const left = daysLeft(data.season.endsAt);
  return <Tag label={`Season ${data.season.number} · ${left} day${left === 1 ? '' : 's'} left`} />;
}

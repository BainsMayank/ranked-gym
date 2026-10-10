import type { LeagueDivision, LeagueOutcome, LeagueScoring } from '@/lib/leagues';

/** Copy shared by the league screens. */

export const divisionName = (d: LeagueDivision) => d.charAt(0).toUpperCase() + d.slice(1);

export const SCORING_LABELS: Record<
  LeagueScoring,
  { title: string; description: string; unit: string }
> = {
  lp: {
    title: 'League Points',
    description:
      'Workouts, planned sessions, PRs, rank-ups and beating your own weeks. Fair at every strength level.',
    unit: 'LP',
  },
  attendance: {
    title: 'Attendance',
    description: 'One point for every day you train. Simple and fair.',
    unit: 'days',
  },
  lift_improvement: {
    title: 'Lift improvement',
    description: 'Rank Score gained on one lift, so a beginner can beat a veteran.',
    unit: 'pts',
  },
  volume: {
    title: 'Volume',
    description: 'Total kilograms lifted in working sets. Favours big lifters; best among equals.',
    unit: 'kg',
  },
};

export function pointsText(points: number | null, scoring: LeagueScoring): string {
  if (points === null) return '—';
  return `${points.toLocaleString('en-IN')} ${SCORING_LABELS[scoring].unit}`;
}

export function outcomeHeadline(
  outcome: LeagueOutcome | null,
  from: LeagueDivision,
  to: LeagueDivision | null,
): string {
  if (outcome === 'promoted') return `Promoted to ${divisionName(to ?? from)}`;
  if (outcome === 'demoted') return `Down to ${divisionName(to ?? from)}`;
  return `You stay in ${divisionName(from)}`;
}

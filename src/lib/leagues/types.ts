/**
 * Weekly leagues, seasons and custom leagues as the server sends them (docs/RANK_SYSTEM.md §18).
 * Everything here is computed in Postgres; the app only displays it.
 */

export const leagueDivisions = ['rookie', 'contender', 'elite', 'legend'] as const;
export type LeagueDivision = (typeof leagueDivisions)[number];

export const leagueScorings = ['lp', 'volume', 'lift_improvement', 'attendance'] as const;
export type LeagueScoring = (typeof leagueScorings)[number];

export const leagueOutcomes = ['promoted', 'stayed', 'demoted'] as const;
export type LeagueOutcome = (typeof leagueOutcomes)[number];

export const challengeKinds = ['most_reps', 'lift_frequency', 'workouts'] as const;
export type ChallengeKind = (typeof challengeKinds)[number];

export interface LpBreakdown {
  workouts: number;
  planned: number;
  prs: number;
  rankUps: number;
  baseline: number;
  strength: number;
  total: number;
  counts: {
    days: number;
    planned: number;
    prs: number;
    rankUps: number;
    sets: number;
    baselineSets: number;
    scoreGain: number;
  };
}

export interface LeagueSeason {
  id: number;
  number: number;
  startsAt: string;
  endsAt: string;
}

export interface LeagueWeek {
  id: number;
  weekNo: number;
  startsAt: string;
  endsAt: string;
}

export interface MyLeague {
  id: string;
  name: string;
  division: LeagueDivision;
  members: number;
  position: number | null;
  points: number | null;
  promote: number;
  demote: number;
}

export interface LeagueResult {
  leagueId: string;
  weekNo: number;
  seasonNumber: number;
  division: LeagueDivision;
  position: number | null;
  points: number | null;
  outcome: LeagueOutcome | null;
  members: number;
  newDivision: LeagueDivision | null;
}

export interface CustomLeagueSummary {
  id: string;
  name: string;
  scoring: LeagueScoring;
  scoringRankKey: string | null;
  endsAt: string;
  members: number;
  position: number | null;
}

export interface LeagueHome {
  season: LeagueSeason | null;
  week: LeagueWeek | null;
  division: LeagueDivision;
  league: MyLeague | null;
  breakdown: LpBreakdown | null;
  result: LeagueResult | null;
  custom: CustomLeagueSummary[];
}

export interface StandingRow {
  position: number;
  userId: string;
  points: number;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  isYou: boolean;
  outcome: LeagueOutcome | null;
  zone: 'promotion' | 'demotion' | null;
}

export interface LeagueStandings {
  leagueId: string;
  kind: 'ranked' | 'custom' | 'community';
  name: string;
  division: LeagueDivision | null;
  scoring: LeagueScoring;
  scoringRankKey: string | null;
  status: 'open' | 'closed';
  startsAt: string;
  endsAt: string;
  inviteCode: string | null;
  isOwner: boolean;
  members: number;
  promote: number;
  demote: number;
  rows: StandingRow[];
}

export interface LeagueChallenge {
  id: string;
  kind: ChallengeKind;
  title: string;
  rankKey: string | null;
  target: number | null;
  startsAt: string;
  endsAt: string;
  mine: number;
  completedBy: number;
  leaders: { displayName: string; value: number; isYou: boolean }[];
}

export interface LeagueHistoryItem {
  leagueId: string;
  kind: 'ranked' | 'custom' | 'community';
  name: string;
  division: LeagueDivision | null;
  scoring: LeagueScoring;
  seasonId: number | null;
  seasonNumber: number | null;
  weekNo: number | null;
  startsAt: string;
  endsAt: string;
  position: number | null;
  points: number | null;
  outcome: LeagueOutcome | null;
  members: number;
}

export interface SeasonRecap {
  season: LeagueSeason & { status: 'open' | 'closed' };
  weeksPlayed: number;
  totalPoints: number;
  bestFinish: number | null;
  promotions: number;
  demotions: number;
  bestDivision: LeagueDivision | null;
  weeks: {
    weekNo: number;
    division: LeagueDivision;
    position: number | null;
    points: number | null;
    outcome: LeagueOutcome | null;
    members: number;
  }[];
  workouts: number;
  prs: number;
  rankUps: number;
  reward: { bestDivision: LeagueDivision; badgeKey: string; frameKey: string | null } | null;
}

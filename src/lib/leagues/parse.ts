import { arr, isObj, num, oneOf, parseList, str } from '@/lib/ranks/json';

import {
  challengeKinds,
  leagueDivisions,
  leagueOutcomes,
  leagueScorings,
  type CustomLeagueSummary,
  type LeagueChallenge,
  type LeagueHistoryItem,
  type LeagueHome,
  type LeagueResult,
  type LeagueSeason,
  type LeagueStandings,
  type LeagueWeek,
  type LpBreakdown,
  type MyLeague,
  type SeasonRecap,
  type StandingRow,
} from './types';

/** Narrowing parsers for the league RPCs; malformed rows are dropped, never shown. */

const KINDS = ['ranked', 'custom', 'community'] as const;
const STATUSES = ['open', 'closed'] as const;
const division = (v: unknown) => oneOf(leagueDivisions, v);
const outcome = (v: unknown) => oneOf(leagueOutcomes, v);

function parseSeason(v: unknown): LeagueSeason | null {
  if (!isObj(v)) return null;
  const id = num(v.id);
  const number = num(v.number);
  const startsAt = str(v.starts_at);
  const endsAt = str(v.ends_at);
  return id === null || number === null || !startsAt || !endsAt
    ? null
    : { id, number, startsAt, endsAt };
}

function parseWeek(v: unknown): LeagueWeek | null {
  if (!isObj(v)) return null;
  const id = num(v.id);
  const weekNo = num(v.week_no);
  const startsAt = str(v.starts_at);
  const endsAt = str(v.ends_at);
  return id === null || weekNo === null || !startsAt || !endsAt
    ? null
    : { id, weekNo, startsAt, endsAt };
}

export function parseBreakdown(v: unknown): LpBreakdown | null {
  if (!isObj(v)) return null;
  const total = num(v.total);
  if (total === null) return null;
  const c = isObj(v.counts) ? v.counts : {};
  return {
    workouts: num(v.workouts) ?? 0,
    planned: num(v.planned) ?? 0,
    prs: num(v.prs) ?? 0,
    rankUps: num(v.rank_ups) ?? 0,
    baseline: num(v.baseline) ?? 0,
    strength: num(v.strength) ?? 0,
    total,
    counts: {
      days: num(c.days) ?? 0,
      planned: num(c.planned) ?? 0,
      prs: num(c.prs) ?? 0,
      rankUps: num(c.rank_ups) ?? 0,
      sets: num(c.sets) ?? 0,
      baselineSets: num(c.baseline_sets) ?? 0,
      scoreGain: num(c.score_gain) ?? 0,
    },
  };
}

function parseMyLeague(v: unknown): MyLeague | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const d = division(v.division);
  if (!id || !d) return null;
  return {
    id,
    name: str(v.name) ?? 'League',
    division: d,
    members: num(v.members) ?? 0,
    position: num(v.position),
    points: num(v.points),
    promote: num(v.promote) ?? 0,
    demote: num(v.demote) ?? 0,
  };
}

function parseResult(v: unknown): LeagueResult | null {
  if (!isObj(v)) return null;
  const leagueId = str(v.league_id);
  const d = division(v.division);
  if (!leagueId || !d) return null;
  return {
    leagueId,
    weekNo: num(v.week_no) ?? 0,
    seasonNumber: num(v.season_number) ?? 0,
    division: d,
    position: num(v.position),
    points: num(v.points),
    outcome: outcome(v.outcome),
    members: num(v.members) ?? 0,
    newDivision: division(v.new_division),
  };
}

function parseCustom(v: unknown): CustomLeagueSummary | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const scoring = oneOf(leagueScorings, v.scoring);
  const endsAt = str(v.ends_at);
  if (!id || !scoring || !endsAt) return null;
  return {
    id,
    name: str(v.name) ?? 'League',
    scoring,
    scoringRankKey: str(v.scoring_rank_key),
    endsAt,
    members: num(v.members) ?? 0,
    position: num(v.position),
  };
}

export function parseLeagueHome(v: unknown): LeagueHome | null {
  if (!isObj(v)) return null;
  return {
    season: parseSeason(v.season),
    week: parseWeek(v.week),
    division: division(v.division) ?? 'rookie',
    league: parseMyLeague(v.league),
    breakdown: parseBreakdown(v.breakdown),
    result: parseResult(v.result),
    custom: parseList(v.custom, parseCustom),
  };
}

function parseRow(v: unknown): StandingRow | null {
  if (!isObj(v)) return null;
  const position = num(v.position);
  const userId = str(v.user_id);
  if (position === null || !userId) return null;
  return {
    position,
    userId,
    points: num(v.points) ?? 0,
    displayName: str(v.display_name) ?? 'Lifter',
    username: str(v.username),
    avatarUrl: str(v.avatar_url),
    isYou: v.is_you === true,
    outcome: outcome(v.outcome),
    zone: oneOf(['promotion', 'demotion'] as const, v.zone),
  };
}

export function parseStandings(v: unknown): LeagueStandings | null {
  if (!isObj(v)) return null;
  const leagueId = str(v.league_id);
  const kind = oneOf(KINDS, v.kind);
  const startsAt = str(v.starts_at);
  const endsAt = str(v.ends_at);
  if (!leagueId || !kind || !startsAt || !endsAt) return null;
  return {
    leagueId,
    kind,
    name: str(v.name) ?? 'League',
    division: division(v.division),
    scoring: oneOf(leagueScorings, v.scoring) ?? 'lp',
    scoringRankKey: str(v.scoring_rank_key),
    status: oneOf(STATUSES, v.status) ?? 'open',
    startsAt,
    endsAt,
    inviteCode: str(v.invite_code),
    isOwner: v.is_owner === true,
    members: num(v.members) ?? 0,
    promote: num(v.promote) ?? 0,
    demote: num(v.demote) ?? 0,
    rows: parseList(v.rows, parseRow),
  };
}

export function parseChallenge(v: unknown): LeagueChallenge | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const kind = oneOf(challengeKinds, v.kind);
  const startsAt = str(v.starts_at);
  const endsAt = str(v.ends_at);
  if (!id || !kind || !startsAt || !endsAt) return null;
  return {
    id,
    kind,
    title: str(v.title) ?? 'Challenge',
    rankKey: str(v.rank_key),
    target: num(v.target),
    startsAt,
    endsAt,
    mine: num(v.mine) ?? 0,
    completedBy: num(v.completed_by) ?? 0,
    leaders: arr(v.leaders).flatMap((l) => {
      if (!isObj(l)) return [];
      const value = num(l.value);
      return value === null
        ? []
        : [{ displayName: str(l.display_name) ?? 'Lifter', value, isYou: l.is_you === true }];
    }),
  };
}

export function parseHistoryItem(v: unknown): LeagueHistoryItem | null {
  if (!isObj(v)) return null;
  const leagueId = str(v.league_id);
  const kind = oneOf(KINDS, v.kind);
  const startsAt = str(v.starts_at);
  const endsAt = str(v.ends_at);
  if (!leagueId || !kind || !startsAt || !endsAt) return null;
  return {
    leagueId,
    kind,
    name: str(v.name) ?? 'League',
    division: division(v.division),
    scoring: oneOf(leagueScorings, v.scoring) ?? 'lp',
    seasonId: num(v.season_id),
    seasonNumber: num(v.season_number),
    weekNo: num(v.week_no),
    startsAt,
    endsAt,
    position: num(v.position),
    points: num(v.points),
    outcome: outcome(v.outcome),
    members: num(v.members) ?? 0,
  };
}

export function parseSeasonRecap(v: unknown): SeasonRecap | null {
  if (!isObj(v)) return null;
  const season = parseSeason(v.season);
  if (!season || !isObj(v.season)) return null;
  const reward = isObj(v.reward) ? v.reward : null;
  const rewardDivision = reward ? division(reward.best_division) : null;
  const badgeKey = reward ? str(reward.badge_key) : null;
  return {
    season: { ...season, status: oneOf(STATUSES, v.season.status) ?? 'open' },
    weeksPlayed: num(v.weeks_played) ?? 0,
    totalPoints: num(v.total_points) ?? 0,
    bestFinish: num(v.best_finish),
    promotions: num(v.promotions) ?? 0,
    demotions: num(v.demotions) ?? 0,
    bestDivision: division(v.best_division),
    weeks: arr(v.weeks).flatMap((w) => {
      if (!isObj(w)) return [];
      const weekNo = num(w.week_no);
      const d = division(w.division);
      return weekNo === null || !d
        ? []
        : [
            {
              weekNo,
              division: d,
              position: num(w.position),
              points: num(w.points),
              outcome: outcome(w.outcome),
              members: num(w.members) ?? 0,
            },
          ];
    }),
    workouts: num(v.workouts) ?? 0,
    prs: num(v.prs) ?? 0,
    rankUps: num(v.rank_ups) ?? 0,
    reward:
      rewardDivision && badgeKey && reward
        ? { bestDivision: rewardDivision, badgeKey, frameKey: str(reward.frame_key) }
        : null,
  };
}

import { countdown, daysLeft } from '../countdown';
import { parseChallenge, parseLeagueHome, parseSeasonRecap, parseStandings } from '../parse';

describe('league parsers', () => {
  it('reads the Leagues tab payload', () => {
    const home = parseLeagueHome({
      season: {
        id: 2,
        number: 2,
        starts_at: '2026-09-07T18:30:00Z',
        ends_at: '2026-11-02T18:30:00Z',
      },
      week: {
        id: 9,
        week_no: 5,
        starts_at: '2026-10-04T18:30:00Z',
        ends_at: '2026-10-11T18:30:00Z',
      },
      division: 'contender',
      league: {
        id: 'l1',
        name: 'Contender league',
        division: 'contender',
        members: 30,
        position: 4,
        points: 215,
        promote: 6,
        demote: 6,
      },
      breakdown: {
        workouts: 120,
        planned: 15,
        prs: 30,
        rank_ups: 30,
        baseline: 50,
        strength: 12,
        total: 257,
        counts: { days: 3, prs: 3 },
      },
      result: {
        league_id: 'l0',
        week_no: 4,
        season_number: 2,
        division: 'rookie',
        position: 2,
        points: 300,
        outcome: 'promoted',
        members: 28,
        new_division: 'contender',
      },
      custom: [
        {
          id: 'c1',
          name: 'Hostel H4',
          scoring: 'attendance',
          ends_at: '2026-10-20T00:00:00Z',
          members: 6,
          position: 1,
        },
        { id: 'bad' },
      ],
    });
    expect(home?.league).toMatchObject({ position: 4, promote: 6 });
    expect(home?.breakdown).toMatchObject({
      total: 257,
      rankUps: 30,
      counts: { days: 3, prs: 3, planned: 0 },
    });
    expect(home?.result).toMatchObject({ outcome: 'promoted', newDivision: 'contender' });
    expect(home?.custom).toHaveLength(1);
    expect(parseLeagueHome({ division: 'mythic' })).toMatchObject({
      division: 'rookie',
      league: null,
      week: null,
    });
  });

  it('reads standings with zones', () => {
    const s = parseStandings({
      league_id: 'l1',
      kind: 'ranked',
      name: 'Rookie league',
      division: 'rookie',
      scoring: 'lp',
      status: 'open',
      starts_at: 'a',
      ends_at: 'b',
      members: 2,
      promote: 0,
      demote: 0,
      rows: [
        {
          position: 1,
          user_id: 'u1',
          points: 90,
          display_name: 'Neha K.',
          is_you: false,
          zone: 'promotion',
        },
        { position: 2, user_id: 'u2', points: 40, display_name: 'You', is_you: true, zone: null },
        { position: 'x' },
      ],
    });
    expect(s?.rows.map((r) => [r.position, r.zone, r.isYou])).toEqual([
      [1, 'promotion', false],
      [2, null, true],
    ]);
  });

  it('reads challenges and season recaps', () => {
    expect(
      parseChallenge({
        id: 'c',
        kind: 'most_reps',
        title: 'Most pull-ups this week',
        rank_key: 'pullUp',
        target: null,
        starts_at: 'a',
        ends_at: 'b',
        mine: 42,
        completed_by: 0,
        leaders: [{ display_name: 'Dev P.', value: 60, is_you: false }, { value: 'x' }],
      }),
    ).toMatchObject({ mine: 42, target: null, leaders: [{ displayName: 'Dev P.', value: 60 }] });
    const recap = parseSeasonRecap({
      season: { id: 1, number: 1, starts_at: 'a', ends_at: 'b', status: 'closed' },
      weeks_played: 8,
      total_points: 2100,
      best_finish: 1,
      promotions: 2,
      demotions: 1,
      best_division: 'elite',
      weeks: [
        {
          week_no: 1,
          division: 'rookie',
          position: 3,
          points: 260,
          outcome: 'promoted',
          members: 30,
        },
      ],
      workouts: 31,
      prs: 18,
      rank_ups: 6,
      reward: { best_division: 'elite', badge_key: 'season-1-elite', frame_key: 'season-elite' },
    });
    expect(recap).toMatchObject({
      weeksPlayed: 8,
      bestDivision: 'elite',
      reward: { frameKey: 'season-elite' },
    });
    expect(recap?.season.status).toBe('closed');
  });
});

describe('countdown', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  it('shows days and hours, then hours and minutes', () => {
    expect(countdown('2026-10-11T18:30:00Z', now)).toBe('3d 06h');
    expect(countdown('2026-10-08T17:20:00Z', now)).toBe('5h 20m');
    expect(countdown('2026-10-08T12:30:00Z', now)).toBe('30m');
    expect(countdown('2026-10-08T12:00:30Z', now)).toBe('Ending now');
  });

  it('rounds days left up', () => {
    expect(daysLeft('2026-10-11T18:30:00Z', now)).toBe(4);
    expect(daysLeft('2026-10-01T00:00:00Z', now)).toBe(0);
  });
});

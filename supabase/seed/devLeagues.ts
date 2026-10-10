/// <reference types="node" />
/**
 * League pieces of the local dev tools: rebuilding league history from the seeded workouts
 * (`pnpm dev:seed`) and printing what a week did (`pnpm leagues:simulate`).
 *
 * League rows are derived game state (standings come from workouts and rank history), so the dev
 * seed rebuilds them for the whole LOCAL database: it clears seasons, weeks, leagues and standings
 * and replays the weekly cycle for each past Monday.
 */

/** Weeks of league history the seed builds: one finished season and part of the next. */
export const HISTORY_WEEKS = 11;

export function leagueHistorySql(now: Date): string {
  return `
-- Rebuild league history (local only).
delete from public.league_seasons;
delete from public.league_standing;
delete from public.leagues where kind <> 'ranked' and owner_id::text like 'de5e%';

do $$
declare
  v_monday timestamptz := public.league_week_start('${now.toISOString()}'::timestamptz)
    - ${HISTORY_WEEKS} * interval '7 days';
begin
  while v_monday <= '${now.toISOString()}'::timestamptz loop
    perform public.league_run_cycle(v_monday + interval '5 minutes');
    commit;
    v_monday := v_monday + interval '7 days';
  end loop;
end $$;
`;
}

/** One line per closed group of a week (or the open week's groups), plus season rewards. */
export function weekSummarySql(weekId: string): string {
  return `
select format('%s %s · %s lifters · top: %s · promoted %s, demoted %s',
    initcap(l.division::text), l.group_no, count(m.user_id),
    (select string_agg(format('%s %s LP', coalesce(p.display_name, p.username), x.final_points), ', '
        order by x.final_position)
      from public.league_members x join public.profiles p on p.id = x.user_id
      where x.league_id = l.id and x.final_position <= 3),
    count(*) filter (where m.outcome = 'promoted'), count(*) filter (where m.outcome = 'demoted'))
from public.leagues l
join public.league_members m on m.league_id = l.id
where l.week_id = ${weekId}
group by l.id
order by l.division desc, l.group_no;
`;
}

export function leagueSummarySql(): string {
  return `
select format('Leagues: %s seasons, %s weeks (%s closed), %s season rewards, open week %s',
  (select count(*) from public.league_seasons),
  (select count(*) from public.league_weeks),
  (select count(*) from public.league_weeks where status = 'closed'),
  (select count(*) from public.season_rewards),
  coalesce((select format('S%s W%s with %s lifters', s.number, w.week_no,
      (select count(*) from public.league_members m join public.leagues l on l.id = m.league_id
       where l.week_id = w.id))
    from public.league_weeks w join public.league_seasons s on s.id = w.season_id
    where w.status = 'open' order by w.starts_at desc limit 1), 'none'));
`;
}

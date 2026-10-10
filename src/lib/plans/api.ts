import { readAllRows } from '@/lib/pagination';
import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';

import { parsePlanSettings } from './engine/input';
import type { PlanDoc } from './engine/types';

type Tables = Database['public']['Tables'];
type PlanRow = Tables['plans']['Row'] & {
  plan_weeks: Tables['plan_weeks']['Row'][];
  plan_days: Tables['plan_days']['Row'][];
};

/** The save_plan payload (snake_case). */
export function planToPayload(doc: PlanDoc): Json {
  return {
    id: doc.id,
    name: doc.name.trim(),
    goal: doc.goal,
    settings: doc.settings as unknown as Json,
    start_date: doc.startDate,
    end_date: doc.endDate,
    status: doc.status,
    paused_at: doc.pausedAt,
    weeks: doc.weeks.map((w) => ({
      id: w.id,
      week: w.week,
      starts_on: w.startsOn,
      deload: w.deload,
    })),
    days: doc.days.map((d) => ({
      id: d.id,
      week: d.week,
      date: d.date,
      original_date: d.originalDate,
      template_key: d.templateKey,
      label: d.label,
      routine_id: d.routineId,
      status: d.status,
    })),
  };
}

/** A plan from the server, or null when its settings can't be read by this app version. */
export function planFromRow(row: PlanRow): PlanDoc | null {
  const settings = parsePlanSettings(row.settings);
  if (!settings) return null;
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    settings,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    pausedAt: row.paused_at,
    updatedAt: row.updated_at,
    weeks: [...row.plan_weeks]
      .sort((a, b) => a.week - b.week)
      .map((w) => ({ id: w.id, week: w.week, startsOn: w.starts_on, deload: w.deload })),
    days: [...row.plan_days]
      .sort((a, b) => a.date.localeCompare(b.date) || a.week - b.week)
      .map((d) => ({
        id: d.id,
        week: d.week,
        date: d.date,
        originalDate: d.original_date,
        templateKey: d.template_key,
        label: d.label,
        routineId: d.routine_id,
        status: d.status,
      })),
  };
}

/** Saves a whole plan; returns the server's updated_at. */
export async function pushPlan(doc: PlanDoc): Promise<string> {
  const { data, error } = await getSupabase().rpc('save_plan', { p: planToPayload(doc) });
  if (error) throw error;
  return data;
}

export async function fetchRemotePlanVersions(): Promise<Map<string, string>> {
  const data = await readAllRows((from, to) =>
    getSupabase()
      .from('plans')
      .select('id, updated_at', { count: 'exact' })
      .order('id')
      .range(from, to),
  );
  return new Map(data.map((r) => [r.id, r.updated_at]));
}

export async function fetchRemotePlans(ids: string[]): Promise<PlanDoc[]> {
  const out: PlanDoc[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const { data, error } = await getSupabase()
      .from('plans')
      .select('*, plan_weeks (*), plan_days (*)')
      .in('id', ids.slice(i, i + 20))
      .returns<PlanRow[]>();
    if (error) throw error;
    for (const row of data) {
      const doc = planFromRow(row);
      if (doc) out.push(doc);
    }
  }
  return out;
}

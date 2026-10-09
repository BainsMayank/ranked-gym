import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { ensureDb } from '@/lib/db/ensureDb';
import { planDays, plans, planWeeks } from '@/lib/db/schema';
import { writeDocTx } from '@/lib/routines/repository';
import type { RoutineDoc } from '@/lib/routines/types';
import { enqueueTx, type Tx } from '@/lib/sync/queue';

import type { PlanDay, PlanDoc } from './engine/types';

/**
 * The local (SQLite) copy of the user's plans: the source of truth on this device. Every write
 * queues the plan (and any routines it changed) for Supabase in the same transaction.
 */

// ─── Reads ──────────────────────────────────────────────────────────────────────────────────────

function readDocTx(tx: Pick<Tx, 'select'>, id: string): PlanDoc | null {
  const plan = tx.select().from(plans).where(eq(plans.id, id)).get();
  if (!plan) return null;
  const weeks = tx
    .select()
    .from(planWeeks)
    .where(eq(planWeeks.planId, id))
    .orderBy(asc(planWeeks.week))
    .all()
    .map(({ planId: _p, ...w }) => w);
  const days = tx
    .select()
    .from(planDays)
    .where(eq(planDays.planId, id))
    .orderBy(asc(planDays.date), asc(planDays.week))
    .all()
    .map(({ planId: _p, ...d }) => d);
  return { ...plan, weeks, days };
}

export async function loadPlanDoc(id: string): Promise<PlanDoc | null> {
  const db = await ensureDb();
  return readDocTx(db, id);
}

/** The active plan (at most one), with its weeks and days. */
export async function loadActivePlan(): Promise<PlanDoc | null> {
  const db = await ensureDb();
  const row = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.status, 'active'))
    .orderBy(desc(plans.startDate))
    .get();
  return row ? readDocTx(db, row.id) : null;
}

/** A day with the plan it belongs to. */
export async function loadPlanDay(dayId: string): Promise<{ plan: PlanDoc; day: PlanDay } | null> {
  const db = await ensureDb();
  const row = db
    .select({ planId: planDays.planId })
    .from(planDays)
    .where(eq(planDays.id, dayId))
    .get();
  const plan = row ? readDocTx(db, row.planId) : null;
  const day = plan?.days.find((d) => d.id === dayId);
  return plan && day ? { plan, day } : null;
}

// ─── Writes ─────────────────────────────────────────────────────────────────────────────────────

/** Writes a plan with its weeks and days (replacing the old ones). No queueing: pull uses it too. */
export function writePlanTx(tx: Tx, doc: PlanDoc): void {
  const { weeks, days, ...plan } = doc;
  tx.insert(plans).values(plan).onConflictDoUpdate({ target: plans.id, set: plan }).run();
  tx.delete(planWeeks).where(eq(planWeeks.planId, doc.id)).run();
  tx.delete(planDays).where(eq(planDays.planId, doc.id)).run();
  for (const w of weeks)
    tx.insert(planWeeks)
      .values({ ...w, planId: doc.id })
      .run();
  for (const d of days)
    tx.insert(planDays)
      .values({ ...d, planId: doc.id })
      .run();
}

/**
 * Starts a new plan: writes its routines and the plan, and ends the current one (completed if its
 * last day has passed, abandoned otherwise). Only one plan is active.
 */
export async function createPlan(
  doc: PlanDoc,
  routines: readonly RoutineDoc[],
  opts: { today: string; now?: string },
): Promise<void> {
  const db = await ensureDb();
  const now = opts.now ?? new Date().toISOString();
  const at = Date.now();
  db.transaction((tx) => {
    const current = tx.select().from(plans).where(eq(plans.status, 'active')).all();
    for (const old of current) {
      if (old.id === doc.id) continue;
      const status = old.endDate < opts.today ? 'completed' : 'abandoned';
      tx.update(plans).set({ status, updatedAt: now }).where(eq(plans.id, old.id)).run();
      enqueueTx(tx, 'plan', old.id, 'upsert', at);
    }
    for (const r of routines) {
      writeDocTx(tx, r);
      enqueueTx(tx, 'routine', r.id, 'upsert', at);
    }
    writePlanTx(tx, { ...doc, updatedAt: now });
    enqueueTx(tx, 'plan', doc.id, 'upsert', at + 1);
  });
}

/**
 * Saves an edited plan (moved, skipped, shifted, paused, ended) and any routines the edit changed
 * (swap or regenerate), in one transaction.
 */
export async function savePlan(doc: PlanDoc, routines: readonly RoutineDoc[] = []): Promise<void> {
  const db = await ensureDb();
  const at = Date.now();
  const now = new Date(at).toISOString();
  db.transaction((tx) => {
    for (const r of routines) {
      writeDocTx(tx, { ...r, updatedAt: now });
      enqueueTx(tx, 'routine', r.id, 'upsert', at);
    }
    writePlanTx(tx, { ...doc, updatedAt: now });
    enqueueTx(tx, 'plan', doc.id, 'upsert', at);
  });
}

/** Marks a pushed plan with the server's updated_at so the next pull skips it. */
export async function markPlanSynced(id: string, updatedAt: string): Promise<void> {
  const db = await ensureDb();
  db.update(plans).set({ updatedAt }).where(eq(plans.id, id)).run();
}

/** Pull: replaces the given plans (keeping days already done here) and removes deleted ones. */
export async function applyPlanPull(input: {
  docs: PlanDoc[];
  removeIds: string[];
}): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    for (const doc of input.docs) {
      // A workout finished here may not have reached the server yet: done stays done.
      const doneHere = new Set(
        tx
          .select({ id: planDays.id })
          .from(planDays)
          .where(and(eq(planDays.planId, doc.id), eq(planDays.status, 'done')))
          .all()
          .map((d) => d.id),
      );
      const days = doc.days.map((d) =>
        doneHere.has(d.id) ? { ...d, status: 'done' as const } : d,
      );
      writePlanTx(tx, { ...doc, days });
    }
    if (input.removeIds.length) {
      tx.delete(planWeeks).where(inArray(planWeeks.planId, input.removeIds)).run();
      tx.delete(planDays).where(inArray(planDays.planId, input.removeIds)).run();
      tx.delete(plans).where(inArray(plans.id, input.removeIds)).run();
    }
  });
}

export async function localPlanVersions(): Promise<Map<string, string>> {
  const db = await ensureDb();
  const rows = db.select({ id: plans.id, updatedAt: plans.updatedAt }).from(plans).all();
  return new Map(rows.map((r) => [r.id, r.updatedAt]));
}

/** Sign-out: drop this user's plans. */
export async function clearPlanData(): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    tx.delete(planDays).run();
    tx.delete(planWeeks).run();
    tx.delete(plans).run();
  });
}

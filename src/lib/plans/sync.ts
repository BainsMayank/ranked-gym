import { registerRoutineSync } from '@/lib/routines/sync';
import { pendingIds, registerSyncHandler, runSync } from '@/lib/sync';

import { fetchRemotePlans, fetchRemotePlanVersions, pushPlan } from './api';
import { applyPlanPull, loadPlanDoc, localPlanVersions, markPlanSynced } from './repository';

/**
 * Plan sync. A whole plan per push (save_plan is idempotent on client ids), after its routines and
 * before workouts that point at its days. The pull downloads plans whose server version differs
 * from the local copy, unless a local change is waiting to be pushed.
 */

let registered = false;

export function registerPlanSync(): void {
  // Plan writes queue the plan's routines too, and they must push first. Registering here covers
  // a plan screen opened from a link before the tabs (which register routine sync) ever mount.
  registerRoutineSync();
  if (registered) return;
  registered = true;
  registerSyncHandler('plan', {
    rank: () => 2,
    push: async (id) => {
      const doc = await loadPlanDoc(id);
      if (!doc) return;
      const updatedAt = await pushPlan(doc);
      const latest = await loadPlanDoc(id);
      if (latest && latest.updatedAt === doc.updatedAt) await markPlanSynced(id, updatedAt);
    },
  });
}

export interface PlanPullResult {
  downloaded: number;
  removed: number;
}

export async function syncPlans(): Promise<PlanPullResult> {
  registerPlanSync();
  await runSync();
  const [remote, local, pending] = await Promise.all([
    fetchRemotePlanVersions(),
    localPlanVersions(),
    pendingIds(['plan']),
  ]);
  const changed = [...remote]
    .filter(([id, v]) => !pending.has(id) && local.get(id) !== v)
    .map(([id]) => id);
  const removeIds = [...local.keys()].filter((id) => !remote.has(id) && !pending.has(id));
  const docs = await fetchRemotePlans(changed);
  await applyPlanPull({ docs, removeIds });
  return { downloaded: docs.length, removed: removeIds.length };
}

import { MAX_RANK_REPS, repFactor } from './e1rm.ts';
import type { EngineSet, RankLiftConfig } from './types.ts';

/**
 * Sets that look impossible are flagged for review instead of scoring or setting records
 * (docs/RANK_SYSTEM.md §11). Full anti-cheat is Phase 13. Mirrors `public.rank_flag_reason`.
 */

/** Any loaded set with more reps than this is flagged, ranked lift or not. */
export const MAX_LOADED_REPS = 100;

export const flagReasons = ['reps_over_limit', 'e1rm_over_limit', 'hold_over_limit'] as const;
export type FlagReason = (typeof flagReasons)[number];

const BODYWEIGHT_LOG_TYPES = new Set(['bodyweight_reps', 'weighted_bodyweight']);

/** Why a completed working set is flagged, or null when it looks fine. */
export function flagReason(
  set: EngineSet,
  lift: RankLiftConfig | null,
  bodyweightKg: number | null,
): FlagReason | null {
  if (!set.completed || set.failed || set.setType === 'warmup') return null;
  if (set.weightMode === 'assisted' || set.logType === 'assisted_bodyweight') return null;
  const reps = set.reps ?? 0;
  const load = set.weightKg ?? 0;
  const bodyweightLift = BODYWEIGHT_LOG_TYPES.has(set.logType);

  if (load > 0 && reps > MAX_LOADED_REPS) return 'reps_over_limit';
  if (lift?.maxReps != null && bodyweightLift && reps > lift.maxReps) return 'reps_over_limit';
  if (lift?.maxHoldSec != null && set.logType === 'duration') {
    if ((set.durationSec ?? 0) > lift.maxHoldSec) return 'hold_over_limit';
  }
  if (lift?.maxRatio != null && bodyweightKg !== null) {
    const system = bodyweightLift ? bodyweightKg + Math.max(0, load) : load;
    const counts = set.logType === 'weight_reps' ? set.weightMode === 'absolute' : bodyweightLift;
    // Sets above 10 reps are judged as if they were 10 reps (a lower bound on their e1RM).
    if (counts && system > 0 && reps >= 1) {
      const e1rm = system * repFactor(Math.min(Math.floor(reps), MAX_RANK_REPS));
      if (e1rm / bodyweightKg > lift.maxRatio) return 'e1rm_over_limit';
    }
  }
  return null;
}

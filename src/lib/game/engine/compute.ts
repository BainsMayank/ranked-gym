import type { RankKey } from '../rankKeys.ts';
import { aggregate, placement, type Placement } from './aggregate.ts';
import { flagReason, type FlagReason } from './guardrails.ts';
import { round2 } from './interpolate.ts';
import { ageFactor, ageFromBirthYear, closestBodyweight, scoreSet } from './score.ts';
import { tierFor } from './tiers.ts';
import type {
  BodyweightLog,
  Discipline,
  Division,
  EngineSet,
  LiftMuscles,
  ProfileSex,
  RankConfig,
  RankScope,
  Tier,
} from './types.ts';

/**
 * A whole user's ranks from their sets: the TypeScript mirror of `public.rank_recompute_user`
 * (docs/RANK_SYSTEM.md). Used by tests and the fake-user generator; the app never computes ranks.
 */

export interface RankInput {
  config: RankConfig;
  sets: readonly EngineSet[];
  bodyweights: readonly BodyweightLog[];
  sex: ProfileSex;
  birthYear: number | null;
  now: Date;
  liftMuscles: LiftMuscles;
}

export interface RankEntry {
  scope: RankScope;
  key: string;
  /** Null while placement isn't done. */
  score: number | null;
  tier: Tier | null;
  division: Division | null;
  status: 'ranked' | 'placement';
  bestSetId: string | null;
  lastSetAt: number | null;
}

export interface LiftScore {
  score: number;
  bestSetId: string;
  lastSetAt: number;
}

export interface RankResult {
  entries: RankEntry[];
  lifts: Map<RankKey, LiftScore>;
  flags: { setId: string; reason: FlagReason }[];
  /** Weighted sets that would rank with a weigh-in within the window. */
  needsBodyweight: Set<string>;
  placement: Placement;
}

interface ScoredSet {
  key: RankKey;
  setId: string;
  at: number;
  score: number;
}

/** Best score per lift inside the window that ends at that lift's latest scored set. */
export function liftScoresInWindow(
  scored: readonly ScoredSet[],
  windowDays: number,
): Map<RankKey, LiftScore> {
  const byKey = new Map<RankKey, ScoredSet[]>();
  for (const s of scored) byKey.set(s.key, [...(byKey.get(s.key) ?? []), s]);
  const out = new Map<RankKey, LiftScore>();
  for (const [key, list] of byKey) {
    const lastSetAt = Math.max(...list.map((s) => s.at));
    const from = lastSetAt - windowDays * 86_400_000;
    let best: ScoredSet | null = null;
    for (const s of list) {
      if (s.at < from) continue;
      if (!best || s.score > best.score || (s.score === best.score && s.at < best.at)) best = s;
    }
    if (best) out.set(key, { score: best.score, bestSetId: best.setId, lastSetAt });
  }
  return out;
}

export function computeRanks(input: RankInput): RankResult {
  const { config } = input;
  const { settings, thresholds } = config;
  const lifter = {
    sex: input.sex,
    ageFactor: ageFactor(ageFromBirthYear(input.birthYear, input.now), config.ageBrackets),
  };
  const liftConfig = new Map(config.lifts.map((l) => [l.rankKey, l]));

  const flags: RankResult['flags'] = [];
  const needsBodyweight = new Set<string>();
  const scored: ScoredSet[] = [];
  for (const set of input.sets) {
    const bw = closestBodyweight(input.bodyweights, set.at, settings.bwWindowDays);
    const reason = flagReason(set, set.rankKey ? (liftConfig.get(set.rankKey) ?? null) : null, bw);
    if (reason) {
      flags.push({ setId: set.id, reason });
      continue;
    }
    const result = scoreSet(config, set, lifter, bw);
    if (result.needsBodyweight) needsBodyweight.add(set.id);
    if (result.score !== null && set.rankKey) {
      scored.push({ key: set.rankKey, setId: set.id, at: set.at, score: round2(result.score) });
    }
  }

  const lifts = liftScoresInWindow(scored, settings.windowDays);
  const entries: RankEntry[] = [];
  const ranked = (scope: RankScope, key: string, score: number, extra?: Partial<RankEntry>) => {
    const pos = tierFor(score, thresholds, settings.maxScore);
    entries.push({
      scope,
      key,
      score,
      tier: pos.tier,
      division: pos.division,
      status: 'ranked',
      bestSetId: null,
      lastSetAt: null,
      ...extra,
    });
  };
  const pending = (scope: RankScope, key: string) =>
    entries.push({
      scope,
      key,
      score: null,
      tier: null,
      division: null,
      status: 'placement',
      bestSetId: null,
      lastSetAt: null,
    });

  for (const [key, l] of lifts) {
    ranked('lift', key, l.score, { bestSetId: l.bestSetId, lastSetAt: l.lastSetAt });
  }

  const scores = new Map([...lifts].map(([k, l]) => [k, l.score]));
  const all = aggregate(scores, input.liftMuscles, config);
  for (const [muscle, score] of all.muscles) ranked('muscle', muscle, score);
  for (const [region, score] of all.regions) ranked('region', region, score);

  const place = placement(all, config);
  if (place.placed && all.weighted !== null) ranked('overall', 'overall', all.weighted);
  else pending('overall', 'overall');

  for (const discipline of ['weightlifting', 'calisthenics'] as const satisfies Discipline[]) {
    const keys = config.lifts.filter((l) => l.discipline === discipline).map((l) => l.rankKey);
    const subset = new Map([...scores].filter(([k]) => keys.includes(k)));
    if (subset.size === 0) continue;
    const agg = aggregate(subset, input.liftMuscles, config);
    if (subset.size >= settings.disciplineMinLifts && agg.weighted !== null) {
      ranked(discipline, discipline, agg.weighted);
    } else {
      pending(discipline, discipline);
    }
  }

  return { entries, lifts, flags, needsBodyweight, placement: place };
}

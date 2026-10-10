import type { MuscleRegion } from '@/lib/exercises/taxonomy';
import { regionLabels } from '@/lib/exercises/taxonomy';

/**
 * Strength balance for the Analysis tab, from server lift and region scores. Ratios compare mean
 * Rank Scores, which are already relative to the standards, so 1.0 means "as strong for your level
 * in both". A tier is 150 points, which turns gaps into plain words.
 */

const PUSH = [
  'benchPress',
  'inclineBench',
  'closeGripBench',
  'dumbbellBench',
  'inclineDumbbellBench',
  'overheadPress',
  'pushPress',
  'dumbbellShoulderPress',
  'dip',
  'pushUp',
  'handstandPushUp',
  'planche',
  'handstand',
] as const;
const PULL = [
  'barbellRow',
  'dumbbellRow',
  'pullUp',
  'chinUp',
  'muscleUp',
  'barbellCurl',
  'dumbbellCurl',
  'frontLever',
  'backLever',
] as const;
const LOWER = [
  'backSquat',
  'frontSquat',
  'bulgarianSplitSquat',
  'deadlift',
  'sumoDeadlift',
  'trapBarDeadlift',
  'romanianDeadlift',
  'hipThrust',
  'pistolSquat',
  'powerClean',
] as const;

export const TIER_POINTS = 150;
export const HEALTHY_RANGE = [0.9, 1.1] as const;

export interface BalanceRatio {
  key: 'push_pull' | 'upper_lower';
  label: string;
  leftLabel: string;
  rightLabel: string;
  ratio: number;
  /** Left mean minus right mean, in tiers. */
  tierGap: number;
  status: 'balanced' | 'left_heavy' | 'right_heavy';
}

const mean = (scores: number[]) =>
  scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

function pick(scores: ReadonlyMap<string, number>, keys: readonly string[]): number[] {
  return keys.flatMap((k) => {
    const s = scores.get(k);
    return s === undefined ? [] : [s];
  });
}

function ratio(
  key: BalanceRatio['key'],
  [leftLabel, rightLabel]: [string, string],
  left: number | null,
  right: number | null,
): BalanceRatio | null {
  if (left === null || right === null || right <= 0) return null;
  const r = Math.round((left / right) * 100) / 100;
  return {
    key,
    label: `${leftLabel} : ${rightLabel}`,
    leftLabel,
    rightLabel,
    ratio: r,
    tierGap: (left - right) / TIER_POINTS,
    status: r < HEALTHY_RANGE[0] ? 'right_heavy' : r > HEALTHY_RANGE[1] ? 'left_heavy' : 'balanced',
  };
}

/** Push : pull and upper : lower ratios (null when a side has no ranked lift). */
export function balanceRatios(liftScores: ReadonlyMap<string, number>): BalanceRatio[] {
  const push = pick(liftScores, PUSH);
  const pull = pick(liftScores, PULL);
  const lower = pick(liftScores, LOWER);
  return [
    ratio('push_pull', ['Push', 'Pull'], mean(push), mean(pull)),
    ratio('upper_lower', ['Upper', 'Lower'], mean([...push, ...pull]), mean(lower)),
  ].filter((r): r is BalanceRatio => r !== null);
}

/** "one tier", "half a tier", "two tiers" … for a gap in tiers. */
export function tierGapWords(gap: number): string {
  const g = Math.abs(gap);
  if (g < 0.75) return 'half a tier';
  const n = Math.round(g);
  return n === 1 ? 'one tier' : n === 2 ? 'two tiers' : `${n} tiers`;
}

/** "Your pulling lags your pushing by one tier" (null when balanced or a gap under ⅓ tier). */
export function balanceSuggestion(r: BalanceRatio): string | null {
  if (r.status === 'balanced' || Math.abs(r.tierGap) < 1 / 3) return null;
  const words: Record<string, string> = {
    Push: 'pushing',
    Pull: 'pulling',
    Upper: 'upper body',
    Lower: 'lower body',
  };
  const [weak, strong] = r.tierGap > 0 ? [r.rightLabel, r.leftLabel] : [r.leftLabel, r.rightLabel];
  return `Your ${words[weak]} lags your ${words[strong]} by ${tierGapWords(r.tierGap)}`;
}

export interface RegionStanding {
  region: MuscleRegion;
  label: string;
  score: number;
  /** Region score minus overall, in points. */
  delta: number;
}

/** Regions from most to least developed relative to the overall score. */
export function regionStandings(
  regionScores: ReadonlyMap<MuscleRegion, number>,
  overall: number | null,
): RegionStanding[] {
  const base = overall ?? mean([...regionScores.values()]) ?? 0;
  return [...regionScores]
    .map(([region, score]) => ({
      region,
      label: regionLabels[region],
      score,
      delta: Math.round((score - base) * 10) / 10,
    }))
    .sort((a, b) => b.delta - a.delta);
}

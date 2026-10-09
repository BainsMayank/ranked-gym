import { rankTiers, type RankTier } from '@/theme';

/**
 * Rank model shared by every feature (Rank, Friends, Home, Profile).
 * Display only: rank values always come from the server (see CLAUDE.md → server-trusted calculations).
 * Every tier but Champion has divisions III → I (docs/RANK_SYSTEM.md §2). The thresholds live in
 * the `rank_thresholds` table; this file only knows the shape of the ladder.
 */

/** Divisions run III (lowest) → I (highest). */
export const DIVISIONS = [3, 2, 1] as const;
export type RankDivision = (typeof DIVISIONS)[number];

export const TIERS_WITHOUT_DIVISIONS: readonly RankTier[] = ['champion'];

export interface Rank {
  tier: RankTier;
  /** Omitted for tiers without divisions. */
  division?: RankDivision;
}

const ROMAN: Record<RankDivision, string> = { 1: 'I', 2: 'II', 3: 'III' };

export function hasDivisions(tier: RankTier): boolean {
  return !TIERS_WITHOUT_DIVISIONS.includes(tier);
}

export function romanDivision(division: RankDivision): string {
  return ROMAN[division];
}

export function tierName(tier: RankTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function rankLabel(tier: RankTier, division?: RankDivision): string {
  if (!division || !hasDivisions(tier)) return tierName(tier);
  return `${tierName(tier)} ${ROMAN[division]}`;
}

/** Position on the whole ladder: Iron III = 0, rising by one per division (Champion = 21). Mirrors `rank_ordinal`. */
export function rankOrdinal({ tier, division }: Rank): number {
  let ordinal = 0;
  for (const t of rankTiers) {
    if (t === tier) {
      if (!hasDivisions(t)) return ordinal;
      return ordinal + DIVISIONS.indexOf(division ?? 3);
    }
    ordinal += hasDivisions(t) ? DIVISIONS.length : 1;
  }
  return ordinal;
}

/** Negative if a is lower than b, 0 if equal, positive if a is higher. */
export function compareRanks(a: Rank, b: Rank): number {
  return rankOrdinal(a) - rankOrdinal(b);
}

/** A rank as the server sends it (division null for Champion), or null when unranked. */
export function rankFromServer(tier: RankTier | null, division: number | null): Rank | null {
  if (!tier) return null;
  if (!hasDivisions(tier)) return { tier };
  const d = DIVISIONS.find((x) => x === division);
  return { tier, division: d ?? 3 };
}

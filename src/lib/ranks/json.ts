import { rankFromServer } from '@/lib/game/ranks';
import { rankTiers, type RankTier } from '@/theme';

/** Narrowing helpers for the JSON the rank functions return (malformed values become null). */

export type Obj = Record<string, unknown>;

export const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
export const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
export const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null =>
  typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null;
export const tier = (v: unknown): RankTier | null => oneOf(rankTiers, v);
export const rank = (t: unknown, d: unknown) => rankFromServer(tier(t), num(d));

/** Keeps the non-null results of a parser over a list. */
export function parseList<T>(v: unknown, parse: (item: unknown) => T | null): T[] {
  return arr(v)
    .map(parse)
    .filter((x): x is T => x !== null);
}

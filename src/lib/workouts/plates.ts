import { kgToLb, lbToKg, roundTo, type WeightUnit } from '@/lib/units';

/**
 * Plate calculator. Works in the user's unit (kg plates for kg users, lb plates for lb users), so
 * the plates it shows are ones that exist in their gym.
 */

/** One plate size the user owns, in kg (as stored in user_settings.plate_inventory). */
export interface PlateStock {
  weight_kg: number;
  pairs: number;
}

/** One plate size in the display unit. */
export interface Plate {
  weight: number;
  pairs: number;
}

export interface PlateLoad {
  /** Plates for one side, heaviest first (display unit). */
  perSide: number[];
  /** What the bar weighs loaded this way (display unit). */
  total: number;
  /** target − total; 0 when it loads exactly. */
  shortBy: number;
  /** The target is lighter than the empty bar. */
  belowBar: boolean;
}

/** The server's default inventory (user_settings.plate_inventory default). */
export const DEFAULT_KG_PLATES: Plate[] = [
  { weight: 25, pairs: 4 },
  { weight: 20, pairs: 2 },
  { weight: 15, pairs: 2 },
  { weight: 10, pairs: 2 },
  { weight: 5, pairs: 2 },
  { weight: 2.5, pairs: 2 },
  { weight: 1.25, pairs: 2 },
];

export const DEFAULT_LB_PLATES: Plate[] = [
  { weight: 45, pairs: 4 },
  { weight: 35, pairs: 2 },
  { weight: 25, pairs: 2 },
  { weight: 10, pairs: 2 },
  { weight: 5, pairs: 2 },
  { weight: 2.5, pairs: 2 },
];

const DEFAULT_KG_SIGNATURE = DEFAULT_KG_PLATES.map((p) => `${p.weight}x${p.pairs}`).join(',');

/**
 * The stored inventory in the user's unit. An lb user who never edited the (kg) default gets
 * standard lb plates; otherwise kg values convert to the nearest 0.25 lb.
 */
export function platesFor(stock: readonly PlateStock[], unit: WeightUnit): Plate[] {
  const signature = stock.map((p) => `${Number(p.weight_kg)}x${p.pairs}`).join(',');
  if (unit === 'lb' && (stock.length === 0 || signature === DEFAULT_KG_SIGNATURE)) {
    return DEFAULT_LB_PLATES;
  }
  if (stock.length === 0) return DEFAULT_KG_PLATES;
  return stock
    .map((p) => ({
      weight: unit === 'kg' ? Number(p.weight_kg) : roundTo(kgToLb(Number(p.weight_kg)), 0.25),
      pairs: p.pairs,
    }))
    .filter((p) => p.weight > 0 && p.pairs > 0)
    .sort((a, b) => b.weight - a.weight);
}

/** Plates in the display unit back to the stored kg shape. */
export function platesToStock(plates: readonly Plate[], unit: WeightUnit): PlateStock[] {
  return plates.map((p) => ({
    weight_kg: unit === 'kg' ? p.weight : roundTo(lbToKg(p.weight), 0.01),
    pairs: p.pairs,
  }));
}

/** The bar in the display unit: a 20 kg bar shows as 45 lb, not 44.1. */
export function barFor(barKg: number, unit: WeightUnit): number {
  if (unit === 'kg') return barKg;
  if (barKg === 20) return 45;
  if (barKg === 15) return 35;
  return roundTo(kgToLb(barKg), 0.5);
}

const SCALE = 100;

/**
 * The plates for one side that get closest to `target` without going over, using no more than the
 * pairs owned. Ties prefer fewer plates. An exhaustive search over counts (heaviest first, stopping
 * at an exact match): a gym has a handful of plate sizes, so this is a few thousand steps at most.
 * Works in hundredths, so 1.25 and 2.5 plates are exact.
 */
export function loadPlates(target: number, bar: number, plates: readonly Plate[]): PlateLoad {
  if (target < bar) return { perSide: [], total: bar, shortBy: 0, belowBar: true };
  const goal = Math.round(((target - bar) / 2) * SCALE);
  const sizes = plates
    .filter((p) => p.weight > 0 && p.pairs > 0)
    .map((p) => ({ units: Math.round(p.weight * SCALE), pairs: p.pairs }))
    .sort((a, b) => b.units - a.units);

  let bestSum = 0;
  let bestCounts: number[] = sizes.map(() => 0);
  let bestPlates = 0;
  const counts = sizes.map(() => 0);

  const search = (i: number, sum: number, used: number): boolean => {
    if (sum > bestSum || (sum === bestSum && used < bestPlates)) {
      bestSum = sum;
      bestPlates = used;
      bestCounts = counts.slice();
    }
    if (sum === goal) return true;
    if (i === sizes.length) return false;
    const size = sizes[i]!;
    const most = Math.min(size.pairs, Math.floor((goal - sum) / size.units));
    for (let n = most; n >= 0; n--) {
      counts[i] = n;
      if (search(i + 1, sum + n * size.units, used + n)) return true;
    }
    counts[i] = 0;
    return false;
  };
  search(0, 0, 0);

  const perSide = sizes.flatMap((size, i) =>
    Array.from({ length: bestCounts[i]! }, () => size.units / SCALE),
  );
  const total = roundTo(bar + (2 * bestSum) / SCALE, 0.01);
  return { perSide, total, shortBy: roundTo(target - total, 0.01), belowBar: false };
}

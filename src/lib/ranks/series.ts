import type { Rank } from '@/lib/game/ranks';
import { rankLabel } from '@/lib/game/ranks';
import { rankTiers, type RankTier } from '@/theme';

import type { RankHistory } from './history';
import type { RankLadder } from './ladder';

/** Rank history → chart data: a score line, rank-up markers and the tier bands behind them. */

export interface ChartPoint {
  /** Epoch milliseconds. */
  x: number;
  y: number;
}

export interface ChartMarker extends ChartPoint {
  rank: Rank;
}

export interface TierBand {
  tier: RankTier;
  from: number;
  to: number;
}

export interface RankSeries {
  points: ChartPoint[];
  markers: ChartMarker[];
  yDomain: [number, number];
  bands: TierBand[];
}

/** First score of each tier on the ladder. */
export function tierFloors(ladder: RankLadder): Map<RankTier, number> {
  const floors = new Map<RankTier, number>();
  for (const t of ladder.thresholds) {
    const current = floors.get(t.tier);
    if (current === undefined || t.minScore < current) floors.set(t.tier, t.minScore);
  }
  return floors;
}

export function rankSeries(history: RankHistory, ladder: RankLadder, now = Date.now()): RankSeries {
  const points = history.snapshots.map((s) => ({ x: Date.parse(s.at), y: s.score }));
  const last = points[points.length - 1];
  // Carry the latest score to today so the line ends at the right edge.
  if (last && last.x < now) points.push({ x: now, y: last.y });

  const markers = history.events
    .filter((e) => e.kind !== 'rank_down')
    .map((e) => ({ x: Date.parse(e.at), y: e.score, rank: e.to }));

  const floors = tierFloors(ladder);
  const ys = points.map((p) => p.y);
  const lo = ys.length ? Math.min(...ys) : 0;
  const hi = ys.length ? Math.max(...ys) : 100;
  // Snap the range out to tier floors, so at least one band edge shows.
  const floorList = rankTiers.map((t) => floors.get(t) ?? 0);
  const yMin = Math.max(0, ...floorList.filter((f) => f <= lo - 10));
  const above = floorList.filter((f) => f >= hi + 10);
  const yMax = above.length ? Math.min(...above) : ladder.maxScore;

  const bands: TierBand[] = rankTiers.flatMap((tier, i) => {
    const from = floors.get(tier);
    if (from === undefined) return [];
    const to = floors.get(rankTiers[i + 1] ?? tier) ?? ladder.maxScore;
    const end = to === from ? ladder.maxScore : to;
    if (end <= yMin || from >= yMax) return [];
    return [{ tier, from: Math.max(from, yMin), to: Math.min(end, yMax) }];
  });

  return { points, markers, yDomain: [yMin, yMax], bands };
}

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

/** "Promoted to Gold III on 12 Sep" for the latest rank-up in range, else null. */
export function latestPromotion(history: RankHistory): string | null {
  const ups = history.events.filter((e) => e.kind === 'rank_up');
  const last = ups[ups.length - 1];
  if (!last) return null;
  return `Promoted to ${rankLabel(last.to.tier, last.to.division)} on ${DATE.format(new Date(last.at))}`;
}

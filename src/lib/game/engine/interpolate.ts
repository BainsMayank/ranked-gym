/**
 * Piecewise-linear interpolation through the origin (docs/RANK_SYSTEM.md §3). Mirrors
 * `public.rank_interp`.
 *
 * The curve runs from (0, 0) through each (x, y) point and keeps the last segment's slope past the
 * end. It's monotone and exactly invertible (swap xs and ys), which predictions rely on, and every
 * division inside a tier is the same step in kg, reps or seconds.
 */
export function interpolate(x: number, xs: readonly number[], ys: readonly number[]): number {
  if (xs.length === 0 || xs.length !== ys.length) return 0;
  if (!(x > 0)) return 0;
  let x0 = 0;
  let y0 = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const x1 = xs[i] ?? 0;
    const y1 = ys[i] ?? 0;
    if (x <= x1) return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
    if (i < xs.length - 1) {
      x0 = x1;
      y0 = y1;
    }
  }
  // Past the last point: extend the last segment.
  const xLast = xs[xs.length - 1] ?? 0;
  const yLast = ys[ys.length - 1] ?? 0;
  const slope = (yLast - y0) / (xLast - x0);
  return yLast + (x - xLast) * slope;
}

/** Linear blend between two numbers. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Rounds to 2 decimals the way Postgres `round(numeric, 2)` does for positive values. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

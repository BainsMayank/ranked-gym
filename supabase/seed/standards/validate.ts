/**
 * Checks on the strength standards. Each returns a list of problems (empty = fine). Run by
 * `pnpm standards:build` before it writes SQL, and by the Jest standards test.
 */
import { muscleRegions } from '../../../src/lib/exercises/taxonomy.ts';
import { rankKeys } from '../../../src/lib/game/rankKeys.ts';
import { TIERS, type RankConfig, type StandardRow } from '../../../src/lib/game/engine/types.ts';
import type { ExerciseSeed } from '../define.ts';

const rising = (values: readonly number[]) =>
  values.every((v, i) => i === 0 || v > (values[i - 1] ?? 0));

function checkRow(row: StandardRow): string[] {
  const at = `${row.rankKey}/${row.variant || '-'}/${row.metric}/${row.sex}/${row.bwMin}-${row.bwMax}`;
  const problems: string[] = [];
  if (row.anchorScores.length === 0) problems.push(`${at}: no anchors.`);
  if (row.anchorScores.length !== row.anchorValues.length)
    problems.push(`${at}: anchor lengths differ.`);
  if (!rising(row.anchorScores)) problems.push(`${at}: anchor scores must rise.`);
  if (!rising(row.anchorValues)) problems.push(`${at}: anchor values must rise.`);
  if (row.anchorValues.some((v) => !(v > 0)))
    problems.push(`${at}: anchor values must be positive.`);
  if (row.anchorScores.some((s) => s <= 0 || s > 1000))
    problems.push(`${at}: scores out of 1–1000.`);
  if (!(row.bwMin < row.bwMax)) problems.push(`${at}: empty bodyweight band.`);
  if (!(row.maxScore > 0 && row.maxScore <= 1000)) problems.push(`${at}: bad max score.`);
  return problems;
}

/** Bands for one (lift, variant, metric, sex) must touch end to end and share anchor scores. */
function checkBands(rows: readonly StandardRow[]): string[] {
  const groups = new Map<string, StandardRow[]>();
  for (const r of rows) {
    const key = `${r.rankKey}/${r.variant}/${r.metric}/${r.sex}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const problems: string[] = [];
  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) => a.bwMin - b.bwMin);
    sorted.forEach((r, i) => {
      const prev = sorted[i - 1];
      if (prev && prev.bwMax !== r.bwMin)
        problems.push(`${key}: bands ${prev.bwMax} and ${r.bwMin} don't meet.`);
      if (prev && prev.anchorScores.join() !== r.anchorScores.join()) {
        problems.push(`${key}: bands use different anchor scores.`);
      }
    });
    const other = key.endsWith('/male')
      ? key.replace(/male$/, 'female')
      : key.replace(/female$/, 'male');
    if (!groups.has(other)) problems.push(`${key}: no matching ${other}.`);
  }
  return problems;
}

export function validateStandards(config: RankConfig, library: readonly ExerciseSeed[]): string[] {
  const problems: string[] = [];
  const bySlug = new Map(library.map((e) => [e.slug, e]));
  const byKey = new Map(library.flatMap((e) => (e.rankKey ? [[e.rankKey, e] as const] : [])));

  for (const key of rankKeys) {
    const lifts = config.lifts.filter((l) => l.rankKey === key);
    if (lifts.length !== 1) problems.push(`${key}: needs exactly one rank_lifts row.`);
    if (!config.standards.some((s) => s.rankKey === key && s.variant === '')) {
      problems.push(`${key}: has no standard.`);
    }
    const exercise = byKey.get(key);
    const lift = lifts[0];
    if (!exercise) problems.push(`${key}: no official exercise carries it.`);
    else if (lift) {
      const ok =
        lift.discipline === 'weightlifting'
          ? ['barbell', 'dumbbell'].includes(exercise.equipment)
          : exercise.equipment === 'bodyweight';
      if (!ok) problems.push(`${key}: ${exercise.equipment} doesn't fit ${lift.discipline}.`);
    }
  }

  for (const v of config.variants) {
    const e = bySlug.get(v.slug);
    if (!e) problems.push(`Variant "${v.slug}" isn't in the library.`);
    else if (e.rankKey !== null) problems.push(`Variant "${v.slug}" already has its own rank key.`);
    else if (e.logType !== byKey.get(v.rankKey)?.logType) {
      problems.push(`Variant "${v.slug}" logs differently from ${v.rankKey}.`);
    }
    if (!config.standards.some((s) => s.variant === v.slug))
      problems.push(`Variant "${v.slug}" has no standard.`);
  }

  problems.push(...config.standards.flatMap(checkRow), ...checkBands(config.standards));

  const thresholds = [...config.thresholds];
  if (thresholds[0]?.minScore !== 0) problems.push('Thresholds must start at 0.');
  if (!rising(thresholds.map((t) => t.minScore))) problems.push('Thresholds must rise.');
  for (const tier of TIERS) {
    const count = thresholds.filter((t) => t.tier === tier).length;
    if (count !== (tier === 'champion' ? 1 : 3))
      problems.push(`${tier}: wrong number of divisions.`);
  }

  const weights = muscleRegions.reduce((sum, r) => sum + config.regionWeights[r], 0);
  if (Math.abs(weights - 1) > 1e-9) problems.push(`Region weights add up to ${weights}, not 1.`);

  config.ageBrackets.forEach((b, i) => {
    const prev = config.ageBrackets[i - 1];
    if (i === 0 && b.minAge !== 0) problems.push('Age brackets must start at 0.');
    if (prev && prev.maxAge !== b.minAge - 1)
      problems.push(`Age brackets ${prev.maxAge} → ${b.minAge} leave a gap.`);
    if (!(b.factor > 0)) problems.push('Age factors must be positive.');
  });
  if (config.ageBrackets.at(-1)?.maxAge !== null)
    problems.push('The last age bracket must be open.');

  return problems;
}

/**
 * Every lift that can earn a rank. An exercise links to one through its `rank_key` (unique), so a
 * lift's history ranks the same whichever library row logged it.
 *
 * Free weights and bodyweight only: machines and cables differ from gym to gym, so they earn XP,
 * volume and records but no rank (docs/RANK_SYSTEM.md §4.3). Keys with a standard today live in
 * `rankedLifts` (strength.ts); the rest get standards in Phase 6.
 *
 * Imported by the Node seed generator, so this file must stay free of React Native and `@/` imports.
 */
export const rankKeys = [
  // Weightlifting
  'backSquat',
  'frontSquat',
  'bulgarianSplitSquat',
  'deadlift',
  'sumoDeadlift',
  'trapBarDeadlift',
  'romanianDeadlift',
  'hipThrust',
  'powerClean',
  'benchPress',
  'inclineBench',
  'closeGripBench',
  'dumbbellBench',
  'inclineDumbbellBench',
  'overheadPress',
  'pushPress',
  'dumbbellShoulderPress',
  'barbellRow',
  'dumbbellRow',
  'barbellCurl',
  'dumbbellCurl',
  // Bodyweight (weightlifting patterns, judged on bodyweight ratios)
  'pullUp',
  'chinUp',
  'dip',
  // Calisthenics discipline (rep and skill standards, Phase 6)
  'pushUp',
  'muscleUp',
  'pistolSquat',
  'handstandPushUp',
  'frontLever',
  'backLever',
  'planche',
  'lSit',
] as const;
export type RankKey = (typeof rankKeys)[number];

export function isRankKey(value: string): value is RankKey {
  return (rankKeys as readonly string[]).includes(value);
}

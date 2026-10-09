/**
 * Calorie estimate: MET × bodyweight (kg) × hours, where MET is the average of the exercises' MET
 * values weighted by completed working sets (`exercises.met_value`, 3.5 by default). Strength
 * training burns unevenly, so this is always shown as an estimate. Mirrors
 * refresh_workout_totals() on the server, which stores the official value.
 */

export interface CalorieInput {
  durationSec: number;
  bodyweightKg: number | null;
  /** Per exercise: its MET (null when unknown) and completed working sets. */
  exercises: readonly { metValue: number | null; sets: number }[];
}

export function averageMet(exercises: CalorieInput['exercises']): number | null {
  let weighted = 0;
  let sets = 0;
  for (const e of exercises) {
    if (e.metValue === null || e.sets <= 0) continue;
    weighted += e.metValue * e.sets;
    sets += e.sets;
  }
  return sets === 0 ? null : weighted / sets;
}

export function estimateCalories({
  durationSec,
  bodyweightKg,
  exercises,
}: CalorieInput): number | null {
  if (!bodyweightKg || bodyweightKg <= 0 || durationSec <= 0) return null;
  const met = averageMet(exercises);
  if (met === null) return null;
  return Math.round((met * bodyweightKg * durationSec) / 3600);
}

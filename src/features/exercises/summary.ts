import {
  equipmentLabels,
  isCustomExercise,
  muscleShortLabels,
  musclesWithRole,
  type Exercise,
} from '@/lib/exercises';

/** "Barbell · Mid/lower chest, Triceps": equipment and the primary movers. */
export function exerciseSummary(exercise: Exercise): string {
  const primary = musclesWithRole(exercise, 'primary').map((m) => muscleShortLabels[m]);
  return [equipmentLabels[exercise.equipment], primary.join(', ')].filter(Boolean).join(' · ');
}

export function exerciseBadge(exercise: Exercise): string | null {
  if (isCustomExercise(exercise)) return 'Custom';
  if (exercise.isRankable) return 'Ranked';
  return null;
}

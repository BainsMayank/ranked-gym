/**
 * Workout enums and limits. `workoutStatuses` is the Postgres enum `workout_status`; a test keeps
 * the two in sync. Free of React Native so the Drizzle schema and pure tests can import it.
 */

export const workoutStatuses = ['in_progress', 'completed', 'discarded'] as const;
export type WorkoutStatus = (typeof workoutStatuses)[number];

/** Who can see a finished workout. Same values as the `profile_visibility` enum. */
export const workoutVisibilities = ['public', 'friends', 'private'] as const;
export type WorkoutVisibility = (typeof workoutVisibilities)[number];

export const visibilityLabels: Record<WorkoutVisibility, string> = {
  public: 'Public',
  friends: 'Friends',
  private: 'Only me',
};

/** Limits shared with save_workout(). */
export const WORKOUT_LIMITS = {
  nameMax: 60,
  notesMax: 1000,
  exerciseNotesMax: 500,
  exercisesMax: 40,
  setsMax: 30,
} as const;

/** Perceived effort 1–10, with a word for each band. */
export function effortWord(effort: number): string {
  if (effort <= 2) return 'Very easy';
  if (effort <= 4) return 'Easy';
  if (effort <= 6) return 'Moderate';
  if (effort <= 8) return 'Hard';
  if (effort === 9) return 'Very hard';
  return 'All out';
}

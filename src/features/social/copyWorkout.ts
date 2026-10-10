import { blankRoutine, type RoutineDoc } from '@/lib/routines';
import type { DetailExercise, Post } from '@/lib/social';
import { routineFromWorkout } from '@/lib/workouts/deviation';

/**
 * A copied workout as a new routine of mine: each logged set becomes a target (reps or time, and
 * their weight unless I leave weights blank). Exercises I can't use (someone's custom exercise)
 * are left out. Credit goes in source/source_ref/source_label.
 */
export function routineFromPost(
  post: Extract<Post, { type: 'workout' }>,
  exercises: readonly DetailExercise[],
  opts: {
    id: string;
    name: string;
    keepWeights: boolean;
    usable: (exercise: DetailExercise) => boolean;
    newId: () => string;
    now: string;
  },
): { doc: RoutineDoc; skipped: DetailExercise[] } {
  const kept = exercises.filter((e) => opts.usable(e) && e.sets.length > 0);
  const skipped = exercises.filter((e) => !opts.usable(e));
  const base: RoutineDoc = {
    ...blankRoutine(opts.id, opts.now),
    name: opts.name.trim().slice(0, 60) || post.workout.name,
    source: 'copied',
    sourceRef: post.id,
    sourceLabel: post.author.username ? `@${post.author.username}` : null,
  };
  const workout = {
    exercises: kept.map((e) => ({
      ...e,
      sets: e.sets
        .filter((s) => !s.failed)
        .map((s) =>
          opts.keepWeights || s.weightMode !== 'absolute' ? s : { ...s, weightKg: null },
        ),
    })),
  };
  return { doc: routineFromWorkout(base, workout, opts.newId, opts.now), skipped };
}

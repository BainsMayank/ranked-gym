/**
 * The official exercise library: the source of truth for the `exercises` and `exercise_muscles`
 * rows. `pnpm exercises:build` validates it and writes a migration that upserts it.
 *
 * To change the library: edit the files in ./exercises, bump LIBRARY_VERSION, run
 * `pnpm exercises:build`, then `pnpm db:reset && pnpm db:test`. Never rename a published slug.
 *
 * Started from free-exercise-db (Unlicense); see docs/CREDITS.md.
 */
import type { ExerciseSeed } from './define.ts';
import { arms } from './exercises/arms.ts';
import { back } from './exercises/back.ts';
import { calisthenics } from './exercises/calisthenics.ts';
import { cardio, mobility } from './exercises/cardioMobility.ts';
import { chest } from './exercises/chest.ts';
import { core } from './exercises/core.ts';
import { fullBody } from './exercises/fullBody.ts';
import { legs } from './exercises/legs.ts';
import { shoulders } from './exercises/shoulders.ts';
import { skills } from './exercises/skills.ts';

/** Apps re-download the library when this changes (exercise_library_meta.version). */
export const LIBRARY_VERSION = 2;

export const exercises: ExerciseSeed[] = [
  ...chest,
  ...shoulders,
  ...arms,
  ...back,
  ...legs,
  ...core,
  ...fullBody,
  ...calisthenics,
  ...skills,
  ...cardio,
  ...mobility,
];

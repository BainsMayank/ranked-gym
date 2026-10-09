import type { Muscle } from '@/lib/exercises/taxonomy';

import type { GroupRole, PlanExercise, PlanGoal, PlanInput, PlanLevel, VolumeGroup } from './types';
import { volumeGroups } from './types';

/**
 * Weekly volume, counted in hard (non-warm-up) sets per muscle group. A set counts 1 for the
 * exercise's main muscle (its first primary muscle), 0.5 for any other primary muscle, and the
 * library weight (0.5 or 0.25) for secondary muscles; stabilisers don't count. A group takes the
 * highest of its muscles. So a back squat set is 1 quads and 0.5 glutes, a row 1 back and 0.5
 * biceps. Front delts working as helpers in presses don't count towards shoulders: they get plenty
 * from every press, and counting them would crowd out chest work. Cardio and mobility never count.
 * Forearms, traps, lower back, adductors and neck aren't tracked.
 */

export const GROUP_MUSCLES: Record<VolumeGroup, readonly Muscle[]> = {
  chest: ['upper_chest', 'mid_lower_chest'],
  back: ['lats', 'upper_back'],
  shoulders: ['front_delts', 'side_delts', 'rear_delts'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quads: ['quads'],
  hamstrings: ['hamstrings'],
  // Abduction work (glute medius) counts towards glutes.
  glutes: ['glutes', 'abductors'],
  calves: ['calves'],
  core: ['abs', 'obliques'],
};

export const groupLabels: Record<VolumeGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
};

const GROUP_OF = new Map<Muscle, VolumeGroup>(
  volumeGroups.flatMap((g) => GROUP_MUSCLES[g].map((m) => [m, g] as const)),
);

/** Hard sets per muscle group per week, by level. */
export const LEVEL_RANGES: Record<PlanLevel, { min: number; max: number }> = {
  beginner: { min: 8, max: 10 },
  intermediate: { min: 10, max: 16 },
  advanced: { min: 12, max: 20 },
};

const MAJOR: readonly VolumeGroup[] = [
  'chest',
  'back',
  'shoulders',
  'quads',
  'hamstrings',
  'glutes',
];

/**
 * Each group's role for a goal: focus (aim for the top of the range), normal (the middle),
 * maintain (the bottom) or minor (small muscles that get plenty from compound lifts). Priority
 * muscles always become focus.
 */
export function groupRoles(goal: PlanGoal, priorities: readonly VolumeGroup[]) {
  const roles = {} as Record<VolumeGroup, GroupRole>;
  for (const g of volumeGroups) roles[g] = MAJOR.includes(g) ? 'normal' : 'minor';
  const set = (groups: VolumeGroup[], role: GroupRole) => groups.forEach((g) => (roles[g] = role));
  if (goal === 'muscle' || goal === 'gain') set(['biceps', 'triceps'], 'maintain');
  if (goal === 'curvier') {
    set(['glutes', 'hamstrings'], 'focus');
    set(['chest', 'back', 'shoulders'], 'maintain');
  }
  if (goal === 'calisthenics') {
    set(['quads', 'hamstrings', 'glutes'], 'maintain');
    set(['core'], 'maintain');
  }
  set([...priorities], 'focus');
  return roles;
}

/** Target, floor (what the engine tries to guarantee) and ceiling for a role at a level. */
export function groupBounds(role: GroupRole, level: PlanLevel) {
  const { min, max } = LEVEL_RANGES[level];
  switch (role) {
    case 'focus':
      return { target: max, floor: min, max };
    case 'normal':
      return { target: Math.round((min + max) / 2), floor: min, max };
    case 'maintain':
      return { target: min, floor: Math.ceil(min * 0.6), max };
    case 'minor':
      return { target: Math.ceil(min * 0.6), floor: 0, max };
  }
}

export interface GroupTarget {
  role: GroupRole;
  target: number;
  floor: number;
  max: number;
}

export function groupTargets(input: Pick<PlanInput, 'goal' | 'level' | 'priorities'>) {
  const roles = groupRoles(input.goal, input.priorities);
  const out = {} as Record<VolumeGroup, GroupTarget>;
  for (const g of volumeGroups) out[g] = { role: roles[g], ...groupBounds(roles[g], input.level) };
  return out;
}

/** How much one working set of this exercise counts for each group. */
export function contribution(exercise: Pick<PlanExercise, 'muscles' | 'category'>) {
  const out = new Map<VolumeGroup, number>();
  if (exercise.category === 'cardio' || exercise.category === 'mobility') return out;
  const main = exercise.muscles.find((m) => m.role === 'primary')?.muscle;
  for (const m of exercise.muscles) {
    if (m.role === 'stabiliser') continue;
    if (m.role === 'secondary' && m.muscle === 'front_delts') continue;
    const g = GROUP_OF.get(m.muscle);
    if (!g) continue;
    const w = m.role === 'primary' ? (m.muscle === main ? 1 : 0.5) : m.weight;
    out.set(g, Math.max(out.get(g) ?? 0, w));
  }
  return out;
}

export type VolumeMap = Record<VolumeGroup, number>;

export function emptyVolume(): VolumeMap {
  return Object.fromEntries(volumeGroups.map((g) => [g, 0])) as VolumeMap;
}

/** Adds `sets` working sets of an exercise to a volume map (mutates). */
export function addVolume(
  into: VolumeMap,
  exercise: Pick<PlanExercise, 'muscles' | 'category'>,
  sets: number,
): void {
  for (const [g, w] of contribution(exercise)) into[g] += w * sets;
}

/** Rounded to a quarter, for display and comparisons. */
export function roundSets(n: number): number {
  return Math.round(n * 4) / 4;
}

/** Weekly volume of a list of sessions (each a routine's exercises), counting working sets. */
export function volumeOfSessions(
  sessions: readonly (readonly { exerciseId: string; sets: readonly { setType: string }[] }[])[],
  library: ReadonlyMap<string, Pick<PlanExercise, 'muscles' | 'category'>>,
): VolumeMap {
  const v = emptyVolume();
  for (const exercises of sessions) {
    for (const e of exercises) {
      const info = library.get(e.exerciseId);
      if (info) addVolume(v, info, e.sets.filter((s) => s.setType !== 'warmup').length);
    }
  }
  return v;
}

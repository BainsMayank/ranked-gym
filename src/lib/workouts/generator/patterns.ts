import type { Exercise } from '@/lib/exercises/types';
import type { Muscle } from '@/lib/exercises/taxonomy';
import { musclesWithRole } from '@/lib/exercises/types';

/**
 * Movement patterns, derived from the library (it has no pattern column): the name tells most
 * lifts apart (a row is a horizontal pull, a pulldown a vertical one), and primary muscles cover
 * the rest. Isolation work is its own pattern per muscle, so the generator never picks two
 * biceps curls but happily pairs a curl with a triceps extension.
 */

export type MovementPattern =
  | 'squat'
  | 'lunge'
  | 'hinge'
  | 'h_push'
  | 'v_push'
  | 'h_pull'
  | 'v_pull'
  | 'core'
  | 'carry'
  | `iso:${Muscle}`
  | `other:${Muscle}`;

type PatternInput = Pick<Exercise, 'slug' | 'mechanic' | 'muscles'>;

const BY_NAME: [RegExp, MovementPattern][] = [
  [/carry/, 'carry'],
  [/row|face-pull/, 'h_pull'],
  [/pull-up|chin-up|pulldown|muscle-up|pullover|lever/, 'v_pull'],
  [
    /deadlift|romanian|good-morning|swing|hip-thrust|pull-through|back-extension|hyperextension|glute-ham|clean|snatch|rack-pull/,
    'hinge',
  ],
  [/lunge|split-squat|step-up|pistol|cossack|shrimp/, 'lunge'],
  [/squat|leg-press|thruster|wall-ball/, 'squat'],
  [
    /overhead|shoulder-press|push-press|arnold|handstand|pike|planche|landmine-press|jerk/,
    'v_push',
  ],
  [/press|push-up|dip/, 'h_push'],
];

const BY_MUSCLE: [Muscle[], MovementPattern][] = [
  [['quads'], 'squat'],
  [['hamstrings', 'glutes'], 'hinge'],
  [['upper_chest', 'mid_lower_chest'], 'h_push'],
  [['front_delts', 'side_delts'], 'v_push'],
  [['lats'], 'v_pull'],
  [['upper_back', 'rear_delts'], 'h_pull'],
  [['abs', 'obliques'], 'core'],
];

export function movementPattern(exercise: PatternInput): MovementPattern {
  const primary = musclesWithRole(exercise, 'primary');
  const first = primary[0] ?? exercise.muscles[0]?.muscle ?? 'abs';
  if (exercise.mechanic === 'isolation') return `iso:${first}`;
  if (primary.some((m) => m === 'abs' || m === 'obliques') && primary.length === 1) return 'core';
  for (const [pattern, result] of BY_NAME) if (pattern.test(exercise.slug)) return result;
  for (const [muscles, result] of BY_MUSCLE) {
    if (primary.some((m) => muscles.includes(m))) return result;
  }
  return `other:${first}`;
}

export function isCompoundPattern(pattern: MovementPattern): boolean {
  return !pattern.startsWith('iso:');
}

import type { PlanGoal, PlanLevel, SlotRole } from './types';

/**
 * Goal profiles: rep ranges, rest, effort (RIR) and set structure for each slot role. Beginners
 * stop a rep further from failure than the profile's base RIR.
 */

export interface Prescription {
  repsMin: number;
  repsMax: number;
  restSec: number;
  rir: number;
  /**
   * straight: every set the same range. fixed: a fixed rep target (beginner strength, 3×5).
   * top_backoff: one heavy top set, then back-off sets at 90% of it.
   */
  structure: 'straight' | 'fixed' | 'top_backoff';
  /** Back-off sets' rep range (top_backoff only). */
  backoff?: { repsMin: number; repsMax: number; rir: number };
  /** The last set goes to failure (advanced hypertrophy isolation work). */
  lastSetFailure?: boolean;
}

export interface GoalProfile {
  summary: string;
  main: Prescription;
  secondary: Prescription;
  accessory: Prescription;
  /** Calisthenics skills: hold seconds by level, or reps when the rung is a rep move. */
  skill: { holdSec: number; restSec: number; repsMin: number; repsMax: number };
  /** Pair accessories into supersets. */
  supersets: boolean;
  /** Working-set caps per exercise. */
  caps: Record<SlotRole, number>;
  /** Weight on accessory work when filling volume (compound emphasis below 1). */
  accessoryWeight: number;
  /** Warm-up sets before the first main lift. */
  warmups: boolean;
}

const p = (
  repsMin: number,
  repsMax: number,
  restSec: number,
  rir: number,
  extra: Partial<Prescription> = {},
): Prescription => ({ repsMin, repsMax, restSec, rir, structure: 'straight', ...extra });

const CAPS = { skill: 4, main: 5, secondary: 4, accessory: 4 };

export function profileFor(goal: PlanGoal, level: PlanLevel): GoalProfile {
  const beginner = level === 'beginner';
  const advanced = level === 'advanced';
  const easier = (rir: number) => Math.min(4, rir + (beginner ? 1 : 0));
  const base = {
    skill: {
      holdSec: beginner ? 15 : advanced ? 25 : 20,
      restSec: 90,
      repsMin: 3,
      repsMax: 6,
    },
    supersets: false,
    caps: CAPS,
    accessoryWeight: 1,
    warmups: true,
  };

  switch (goal) {
    case 'stronger':
      return {
        ...base,
        summary:
          'Heavy, low-rep main lifts (3–6 reps) with long rests (2–4 min) so every set is good quality, stopping 1–3 reps short of failure.',
        main: beginner
          ? p(5, 5, 180, 2, { structure: 'fixed' })
          : p(3, 5, advanced ? 210 : 180, 1, {
              structure: 'top_backoff',
              backoff: { repsMin: 4, repsMax: 6, rir: 2 },
            }),
        secondary: p(4, 6, 150, easier(2)),
        accessory: p(8, 12, 90, easier(2)),
      };
    case 'muscle':
    case 'gain':
      return {
        ...base,
        summary:
          goal === 'gain'
            ? 'Muscle-building rep ranges with extra weight on the big compound lifts: 5–10 reps on compounds, 10–15 on isolation work, 1–2 min rest. Eat in a small surplus to gain.'
            : 'Hypertrophy rep ranges: 6–12 reps on compound lifts, 10–15 on isolation work, 60–120 s rest, finishing 0–2 reps short of failure.',
        main: goal === 'gain' ? p(5, 8, 150, easier(1)) : p(6, 10, 120, easier(1)),
        secondary: goal === 'gain' ? p(6, 10, 120, easier(1)) : p(8, 12, 90, easier(1)),
        accessory: p(10, 15, 75, beginner ? 2 : advanced ? 0 : 1, { lastSetFailure: advanced }),
        caps: goal === 'gain' ? { ...CAPS, accessory: 3 } : CAPS,
        accessoryWeight: goal === 'gain' ? 0.7 : 1,
      };
    case 'fat':
    case 'toned':
      return {
        ...base,
        summary:
          goal === 'fat'
            ? 'Keep lifting heavy enough to hold on to muscle (8–15 reps), with accessories in supersets and shorter rests so sessions move quickly. Fat loss itself comes from eating a little less.'
            : 'Moderate weights for 10–15 reps, accessories in supersets and short rests: firm, defined muscle without long sessions.',
        main: goal === 'fat' ? p(8, 12, 90, easier(2)) : p(10, 12, 75, easier(2)),
        secondary: goal === 'fat' ? p(10, 12, 75, easier(2)) : p(12, 15, 60, easier(2)),
        accessory: p(12, 15, 45, easier(2)),
        supersets: true,
      };
    case 'curvier':
      return {
        ...base,
        summary:
          'Glute-first sessions: hip thrusts, Romanian deadlifts, split squats and abduction work in 8–15 reps, finishing 1–2 reps short of failure.',
        main: p(8, 12, 120, easier(1)),
        secondary: p(10, 12, 90, easier(1)),
        accessory: p(12, 15, 60, easier(1)),
      };
    case 'calisthenics':
      return {
        ...base,
        summary:
          'Skill practice first while you are fresh (holds by time), then bodyweight strength progressions: 5–8 reps on the hardest moves, 8–12 on the rest.',
        main: p(5, 8, 150, easier(1)),
        secondary: p(6, 10, 120, easier(1)),
        accessory: p(8, 12, 75, easier(1)),
        warmups: false,
      };
    case 'general':
      return {
        ...base,
        summary:
          'All-round training: 8–12 reps on compound lifts, 12–15 on accessories, about 1–2 min rest, finishing 2–3 reps short of failure.',
        main: p(8, 10, 120, easier(2)),
        secondary: p(10, 12, 90, easier(2)),
        accessory: p(12, 15, 60, easier(2)),
      };
  }
}

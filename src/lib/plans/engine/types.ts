import type { Equipment, Muscle } from '@/lib/exercises/taxonomy';
import type { Exercise } from '@/lib/exercises/types';
import type { ExperienceLevel, PrimaryGoal } from '@/lib/profile/options';
import type { EffortMetric } from '@/lib/routines/taxonomy';
import type { RoutineDoc } from '@/lib/routines/types';

/**
 * Plan engine types. Pure data: no React, SQLite or network. The engine turns a questionnaire
 * (PlanInput) into a GeneratedPlan (session templates as routines, a weekly schedule, volume and a
 * plain-text explanation); `schedulePlan` then lays it on the calendar as weeks and days.
 */

export type PlanGoal = PrimaryGoal;
export type PlanLevel = ExperienceLevel;

/** Mon = 0 … Sun = 6 (same as DayPicker). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Schedule = { kind: 'count'; days: number } | { kind: 'weekdays'; weekdays: number[] };

export const sessionMinutes = [30, 45, 60, 75, 90] as const;
export type SessionMinutes = (typeof sessionMinutes)[number];

export const planLengths = [4, 6, 8] as const;
export type PlanLength = (typeof planLengths)[number];

export const equipmentPresets = ['gym', 'dumbbells', 'bodyweight', 'custom'] as const;
export type EquipmentPreset = (typeof equipmentPresets)[number];

/** The 10 muscle groups that weekly volume and priorities are counted in. */
export const volumeGroups = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
] as const;
export type VolumeGroup = (typeof volumeGroups)[number];

export interface PlanEquipment {
  preset: EquipmentPreset;
  /** Custom preset only. Bodyweight is always available. */
  custom: Equipment[];
  /** Pull-up and dip bars (implied by a full gym). */
  bars: boolean;
}

/** The questionnaire's answers. */
export interface PlanInput {
  goal: PlanGoal;
  level: PlanLevel;
  schedule: Schedule;
  minutes: SessionMinutes;
  /** Fat loss and toned only: finish sessions with 10–20 min of easy cardio. */
  cardio: boolean;
  equipment: PlanEquipment;
  /** Up to 3. */
  priorities: VolumeGroup[];
  /** Exercise ids to leave out (discomfort, dislike). */
  avoid: string[];
  weeks: PlanLength;
}

/** What `plans.settings` stores: the answers plus what's needed to regenerate the same plan. */
export interface PlanSettings {
  v: 1;
  input: PlanInput;
  seed: number;
}

/** A library exercise as the engine reads it (the generator's shape). */
export type PlanExercise = Pick<
  Exercise,
  | 'id'
  | 'slug'
  | 'name'
  | 'category'
  | 'equipment'
  | 'mechanic'
  | 'logType'
  | 'muscles'
  | 'createdBy'
  | 'isRankable'
>;

export interface EngineContext {
  library: readonly PlanExercise[];
  newId: () => string;
  effort: EffortMetric;
}

/** How an exercise progresses, stored as `routine_exercises.progression_rule`. */
export type ProgressionRule =
  | { v: 1; kind: 'linear'; reps: number; incrementKg: number; stepKg: number }
  | {
      v: 1;
      kind: 'double';
      repsMin: number;
      repsMax: number;
      incrementKg: number;
      stepKg: number;
    }
  | { v: 1; kind: 'reps'; repsMin: number; repsMax: number; nextSlug: string | null }
  | {
      v: 1;
      kind: 'hold';
      targetSec: number;
      addSec: number;
      maxSec: number;
      nextSlug: string | null;
    }
  | { v: 1; kind: 'none' };

export type SlotRole = 'skill' | 'main' | 'secondary' | 'accessory';

export type TemplateFamily = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs';

export interface ExplanationSection {
  title: string;
  body: string;
}

export type GroupRole = 'focus' | 'normal' | 'maintain' | 'minor';

export interface GroupVolume {
  group: VolumeGroup;
  role: GroupRole;
  /** Weekly hard sets in a normal week (fractional: secondary movers count 0.5 or 0.25). */
  sets: number;
  deloadSets: number;
  /** What the engine aimed for, the floor it tries to guarantee, and the ceiling it never passes. */
  target: number;
  floor: number;
  max: number;
  /** Why it stayed under the floor, if it did. */
  shortfall: string | null;
}

export interface GeneratedSession {
  key: string;
  label: string;
  family: TemplateFamily;
  routine: RoutineDoc;
  /** The last week's lighter copy (6- and 8-week plans). */
  deload: RoutineDoc | null;
}

export interface GeneratedPlan {
  id: string;
  name: string;
  goal: PlanGoal;
  settings: PlanSettings;
  splitLabel: string;
  /** One per session type; a template can appear on more than one weekday. */
  sessions: GeneratedSession[];
  /** Training weekdays in order with the session each one gets. */
  week: { weekday: Weekday; key: string }[];
  volume: GroupVolume[];
  explanation: ExplanationSection[];
}

export type PlanStatus = 'active' | 'completed' | 'abandoned';
export type PlanDayStatus = 'pending' | 'done' | 'missed' | 'moved';

export interface PlanWeek {
  id: string;
  week: number;
  /** Monday, YYYY-MM-DD. */
  startsOn: string;
  deload: boolean;
}

export interface PlanDay {
  id: string;
  week: number;
  /** YYYY-MM-DD (local). */
  date: string;
  originalDate: string;
  templateKey: string;
  label: string;
  routineId: string | null;
  status: PlanDayStatus;
}

/** A plan row (public.plans). */
export interface Plan {
  id: string;
  name: string;
  goal: PlanGoal;
  settings: PlanSettings;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  /** ISO; set while paused. */
  pausedAt: string | null;
  updatedAt: string;
}

/** A plan with its weeks and days: the unit sync pushes. */
export interface PlanDoc extends Plan {
  weeks: PlanWeek[];
  days: PlanDay[];
}

export type StartChoice = 'this_week' | 'next_week';

export type { Muscle };

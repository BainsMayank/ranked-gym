import { estimateDurationMin, estimateDurationSec } from '@/lib/routines/duration';
import type { RoutineDoc, RoutineExercise } from '@/lib/routines/types';
import { goalOptions } from '@/lib/profile/options';

import {
  buildSession,
  type BuildContext,
  type Entry,
  type Finisher,
  type TemplateBuild,
} from './build';
import { FINISHERS } from './catalog';
import { deloadExercises } from './deload';
import { explainPlan } from './explain';
import { fitWeek, weeklyVolume } from './fit';
import { availableEquipment, dayCount, hasBars, wantsFinisher } from './input';
import { profileFor } from './profiles';
import { planWeek, trainingWeekdays } from './schedule';
import {
  coveragePattern,
  fitsFamily,
  pickForSlot,
  slotCandidates,
  slotPreference,
  usable,
  type SelectionRules,
} from './select';
import { templatesFor, type SessionTemplate } from './splits';
import type {
  EngineContext,
  GeneratedPlan,
  GeneratedSession,
  GroupVolume,
  PlanExercise,
  PlanInput,
  TemplateFamily,
  VolumeGroup,
} from './types';
import { volumeGroups } from './types';
import { contribution, emptyVolume, groupTargets, roundSets } from './volume';

/**
 * The plan generator. Pure and deterministic: the same answers, library and seed always give the
 * same plan. See docs/PLAN_ENGINE.md for the rules.
 */

export const ENGINE_VERSION = 1;

function rulesFor(input: PlanInput, library: readonly PlanExercise[]): SelectionRules {
  return { input, library, bySlug: new Map(library.map((e) => [e.slug, e])) };
}

function finisherFor(input: PlanInput, library: readonly PlanExercise[]): Finisher | null {
  if (!wantsFinisher(input)) return null;
  const kit = availableEquipment(input.equipment);
  const bySlug = new Map(library.map((e) => [e.slug, e]));
  const exercise = FINISHERS.map((s) => bySlug.get(s)).find(
    (e) => e && e.createdBy === null && kit.has(e.equipment) && !input.avoid.includes(e.id),
  );
  if (!exercise) return null;
  return { exercise, minutes: input.minutes <= 45 ? 10 : input.minutes <= 60 ? 15 : 20 };
}

/** Picks an exercise for every slot; the week avoids repeating non-main exercises. */
function selectWeek(
  keys: string[],
  templates: Record<string, SessionTemplate>,
  rules: SelectionRules,
  seed: number,
  counts: Map<string, number>,
): TemplateBuild[] {
  const inWeek = new Set<string>();
  return keys.map((key) => {
    const template = templates[key]!;
    const inSession = new Set<string>();
    const entries: Entry[] = [];
    const empty: TemplateBuild['empty'] = [];
    for (const slot of template.slots) {
      const exercise = pickForSlot(slot, template, rules, {
        inSession,
        inWeek,
        seed,
        salt: `${key}:${slot.key}`,
      });
      if (!exercise) {
        empty.push(slot);
        continue;
      }
      inSession.add(exercise.id);
      inWeek.add(exercise.id);
      entries.push({ slot, exercise, sets: 0 });
    }
    return { template, count: counts.get(key) ?? 1, entries, empty, timeLimited: false };
  });
}

function routineDoc(
  id: string,
  name: string,
  planId: string,
  exercises: RoutineExercise[],
  description: string | null,
  now: string,
): RoutineDoc {
  return {
    id,
    folderId: null,
    name: name.slice(0, 60),
    description,
    colour: null,
    estimatedDurationMin: estimateDurationMin(exercises),
    source: 'plan',
    sourceRef: planId,
    sortOrder: 0,
    archived: false,
    updatedAt: now,
    exercises,
  };
}

export interface GenerateOptions {
  seed?: number;
  /** ISO, for routine `updatedAt`. */
  now?: string;
  /** Reuse an id (regenerating a session of an existing plan). */
  planId?: string;
}

export function generatePlan(
  input: PlanInput,
  ctx: EngineContext,
  options: GenerateOptions = {},
): GeneratedPlan {
  const seed = options.seed ?? 0;
  const now = options.now ?? new Date().toISOString();
  const planId = options.planId ?? ctx.newId();
  const templates = templatesFor(input.goal);
  const rules = rulesFor(input, ctx.library);
  // A template is usable when at least two of its lifts can be filled with this kit. Calisthenics
  // counts only real progressions, so without a bar there are no pull days of dumbbell rows.
  const usableTemplate = (key: string) => {
    const t = templates[key];
    if (!t) return false;
    const filled = t.slots.filter((s) => {
      if (s.role === 'accessory') return false;
      const found = slotCandidates(s, t.family, rules);
      const ladder = s.ladder ? slotPreference(s, input.level) : null;
      return ladder ? found.some((e) => ladder.includes(e.slug)) : found.length > 0;
    });
    return filled.length >= 2;
  };
  const week = planWeek(
    input.goal,
    input.level,
    trainingWeekdays(input.schedule),
    templates,
    usableTemplate,
    input.minutes,
  );

  const counts = new Map<string, number>();
  for (const d of week.week) counts.set(d.key, (counts.get(d.key) ?? 0) + 1);
  const keys = [...counts.keys()];

  const base = profileFor(input.goal, input.level);
  // With three days or fewer each session carries more of the week: exercises may take a set more.
  const profile =
    week.week.length <= 3
      ? {
          ...base,
          caps: {
            ...base.caps,
            secondary: base.caps.secondary + 1,
            accessory: base.caps.accessory + 1,
          },
        }
      : base;
  const targets = groupTargets(input);
  const finisher = finisherFor(input, ctx.library);
  const buildCtx: BuildContext = {
    profile,
    level: input.level,
    effort: ctx.effort,
    newId: ctx.newId,
  };

  const builds = selectWeek(keys, templates, rules, seed, counts);
  fitWeek(builds, { targets, budgetSec: input.minutes * 60, finisher, ctx: buildCtx });

  const deloads = input.weeks >= 6;
  const logTypeOf = new Map(ctx.library.map((e) => [e.id, e.logType]));
  const categoryOf = new Map(ctx.library.map((e) => [e.id, e]));
  const deloadVolume = emptyVolume();
  const sessions: GeneratedSession[] = builds.map((b) => {
    const exercises = buildSession(b.entries, finisher, buildCtx);
    const routine = routineDoc(ctx.newId(), b.template.label, planId, exercises, null, now);
    let deload: RoutineDoc | null = null;
    if (deloads) {
      const lighter = deloadExercises(
        exercises,
        (id) => logTypeOf.get(id) ?? 'weight_reps',
        ctx.newId,
      );
      deload = routineDoc(
        ctx.newId(),
        `${b.template.label} · Deload`,
        planId,
        lighter,
        'Deload week: fewer sets, about 90% of your weights, more reps in reserve.',
        now,
      );
      for (const e of lighter) {
        const info = categoryOf.get(e.exerciseId);
        const working = e.sets.filter((s) => s.setType !== 'warmup').length;
        if (info) for (const [g, w] of contribution(info)) deloadVolume[g] += w * working * b.count;
      }
    }
    return {
      key: b.template.key,
      label: b.template.label,
      family: b.template.family,
      routine,
      deload,
    };
  });

  const volume = summariseVolume(input, builds, targets, deloadVolume, rules);
  const labels = Object.fromEntries(sessions.map((s) => [s.key, s.label]));
  const avoidedNames = input.avoid
    .map((id) => ctx.library.find((e) => e.id === id)?.name)
    .filter((n): n is string => !!n);
  const goalTitle = goalOptions.find((g) => g.id === input.goal)?.title ?? 'Plan';

  return {
    id: planId,
    name: `${goalTitle} · ${week.week.length} days`,
    goal: input.goal,
    settings: { v: 1, input, seed },
    splitLabel: week.choice.label,
    sessions,
    week: week.week,
    volume,
    explanation: explainPlan({
      input,
      week,
      labels,
      profile,
      volume,
      avoidedNames,
      finisherName: finisher?.exercise.name ?? null,
      finisherMinutes: finisher?.minutes ?? 0,
      sessionMinutes: sessions.map((x) => estimateDurationSec(x.routine.exercises) / 60),
      missingPatterns: missingPatterns(sessions, ctx.library),
      hasSupersets: sessions.some((x) => x.routine.exercises.some((e) => e.supersetGroup !== null)),
      weighted: sessions.some((x) =>
        x.routine.exercises.some((e) => logTypeOf.get(e.exerciseId) === 'weight_reps'),
      ),
    }),
  };
}

function summariseVolume(
  input: PlanInput,
  builds: readonly TemplateBuild[],
  targets: ReturnType<typeof groupTargets>,
  deload: Record<VolumeGroup, number>,
  rules: SelectionRules,
): GroupVolume[] {
  const v = weeklyVolume(builds);
  const families = new Set(builds.map((b) => b.template.family));
  return volumeGroups.map((group) => {
    const t = targets[group];
    let shortfall: string | null = null;
    if (v[group] < t.floor - 1e-6) {
      shortfall = shortfallReason(group, input, builds, families, rules, t.floor);
    }
    return {
      group,
      role: t.role,
      sets: roundSets(v[group]),
      deloadSets: roundSets(deload[group]),
      target: t.target,
      floor: t.floor,
      max: t.max,
      shortfall,
    };
  });
}

function shortfallReason(
  group: VolumeGroup,
  input: PlanInput,
  builds: readonly TemplateBuild[],
  families: ReadonlySet<TemplateFamily>,
  rules: SelectionRules,
  floor: number,
): string {
  const trains = (e: PlanExercise) => (contribution(e).get(group) ?? 0) >= 1;
  const possible = rules.library.some(
    (e) => usable(e, rules) && trains(e) && [...families].some((f) => fitsFamily(e, f)),
  );
  if (!possible) {
    return hasBars(input.equipment)
      ? `nothing in your equipment trains it directly.`
      : `nothing in your equipment trains it directly; a pull-up bar would help.`;
  }
  const squeezed = builds.some(
    (b) =>
      b.timeLimited &&
      b.template.slots.some((s) => slotCandidates(s, b.template.family, rules).some(trains)),
  );
  if (squeezed) {
    return `${input.minutes}-minute sessions can't fit ${floor} sets alongside everything else. Add a day or 15 minutes to reach it.`;
  }
  if (targetsRole(input, group) === 'maintain') {
    return 'kept near the minimum so your main goal gets the time.';
  }
  const days = dayCount(input);
  return `${days} days a week leaves limited room for more direct work without overloading single sessions; adding a day would raise it.`;
}

function targetsRole(input: PlanInput, group: VolumeGroup) {
  return groupTargets(input)[group].role;
}

const PATTERNS = ['squat', 'hinge', 'lunge', 'h_push', 'v_push', 'h_pull', 'v_pull', 'core'];

function missingPatterns(sessions: readonly GeneratedSession[], library: readonly PlanExercise[]) {
  const byId = new Map(library.map((e) => [e.id, e]));
  const covered = new Set<string>();
  for (const s of sessions) {
    for (const e of s.routine.exercises) {
      const info = byId.get(e.exerciseId);
      if (info && info.category !== 'cardio') covered.add(coveragePattern(info));
    }
  }
  return PATTERNS.filter((p) => !covered.has(p));
}

/** A session template's family, for the calendar's back-to-back checks. */
export function templateFamily(input: Pick<PlanInput, 'goal'>, key: string): TemplateFamily | null {
  return templatesFor(input.goal)[key]?.family ?? null;
}

/** Alternatives for one exercise in a session: same slot choices first, then the same pattern or muscle. */
export function swapCandidates(
  input: PlanInput,
  templateKey: string,
  exerciseId: string,
  inSession: readonly string[],
  library: readonly PlanExercise[],
): PlanExercise[] {
  const template = templatesFor(input.goal)[templateKey];
  const current = library.find((e) => e.id === exerciseId);
  if (!template || !current) return [];
  const rules = rulesFor(input, library);
  const taken = new Set(inSession);
  const slots = template.slots.filter((s) =>
    slotCandidates(s, template.family, rules).some((e) => e.id === exerciseId),
  );
  const fromSlots = slots.flatMap((s) => slotCandidates(s, template.family, rules));
  const mainMuscle = current.muscles.find((m) => m.role === 'primary')?.muscle;
  const similar = library.filter(
    (e) =>
      usable(e, rules) &&
      fitsFamily(e, template.family) &&
      e.mechanic === current.mechanic &&
      e.muscles.some((m) => m.role === 'primary' && m.muscle === mainMuscle),
  );
  const seen = new Set<string>();
  return [...fromSlots, ...similar].filter((e) => {
    if (e.id === exerciseId || taken.has(e.id) || seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

/** A fresh take on one session (new seed): its routine exercises, from the same rules. */
export function regenerateSession(
  input: PlanInput,
  templateKey: string,
  ctx: EngineContext,
  seed: number,
): { exercises: RoutineExercise[]; deload: RoutineExercise[] | null } | null {
  const plan = generatePlan(input, ctx, { seed });
  const session = plan.sessions.find((s) => s.key === templateKey);
  if (!session) return null;
  return { exercises: session.routine.exercises, deload: session.deload?.exercises ?? null };
}

/** The split and week the answers lead to, without picking exercises (for the questionnaire). */
export function previewSplit(input: PlanInput): {
  label: string;
  week: { weekday: number; label: string }[];
} {
  const templates = templatesFor(input.goal);
  const week = planWeek(
    input.goal,
    input.level,
    trainingWeekdays(input.schedule),
    templates,
    undefined,
    input.minutes,
  );
  return {
    label: week.choice.label,
    week: week.week.map((d) => ({ weekday: d.weekday, label: templates[d.key]!.label })),
  };
}

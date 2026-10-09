import { equipmentTypes, type Equipment, type Muscle } from '@/lib/exercises/taxonomy';
import { estimateDurationSec } from '@/lib/routines/duration';
import { validateRoutineDoc } from '@/lib/routines/validate';
import type { RoutineExercise } from '@/lib/routines/types';
import { createRng } from '@/lib/workouts/generator/random';

import { addDays, schedulePlan } from '../calendar';
import { NEEDS_BARS } from '../catalog';
import { deloadSetCount } from '../deload';
import { generatePlan } from '../generate';
import { availableEquipment, hasBars } from '../input';
import { parseRule } from '../progression';
import { renderPlan } from '../render';
import { coveragePattern } from '../select';
import type { GeneratedPlan, PlanInput, PlanLevel, Schedule, VolumeGroup } from '../types';
import { planLengths, sessionMinutes, volumeGroups } from '../types';
import { byId, ctx, idOf, input, library, NOW } from '../__fixtures__/library';

const goals = [
  'stronger',
  'muscle',
  'fat',
  'gain',
  'toned',
  'curvier',
  'calisthenics',
  'general',
] as const;
const levels: PlanLevel[] = ['beginner', 'intermediate', 'advanced'];
const schedules: Schedule[] = [
  ...[2, 3, 4, 5, 6].map((days) => ({ kind: 'count' as const, days })),
  { kind: 'weekdays', weekdays: [0, 1] },
  { kind: 'weekdays', weekdays: [5, 6] },
  { kind: 'weekdays', weekdays: [6, 0] },
  { kind: 'weekdays', weekdays: [0, 1, 2] },
  { kind: 'weekdays', weekdays: [4, 5, 6] },
  { kind: 'weekdays', weekdays: [0, 2, 4] },
  { kind: 'weekdays', weekdays: [0, 1, 2, 3] },
  { kind: 'weekdays', weekdays: [5, 6, 0, 1] },
  { kind: 'weekdays', weekdays: [0, 1, 2, 3, 4] },
  { kind: 'weekdays', weekdays: [0, 3, 4, 5, 6] },
  { kind: 'weekdays', weekdays: [1, 2, 3, 4, 5, 6] },
  { kind: 'weekdays', weekdays: [0, 1, 2, 3, 4, 6] },
];
const equipments: PlanInput['equipment'][] = [
  { preset: 'gym', custom: [], bars: true },
  { preset: 'dumbbells', custom: [], bars: false },
  { preset: 'dumbbells', custom: [], bars: true },
  { preset: 'bodyweight', custom: [], bars: false },
  { preset: 'bodyweight', custom: [], bars: true },
  { preset: 'custom', custom: ['dumbbell', 'cable', 'machine'], bars: false },
  { preset: 'custom', custom: ['barbell', 'band'], bars: true },
];
const avoidable = [
  'barbell-back-squat',
  'barbell-deadlift',
  'barbell-bench-press',
  'pull-up',
  'dumbbell-lateral-raise',
];

/** A seeded sample across every dimension (the full grid is ~150k plans). */
function sample(n: number): PlanInput[] {
  const rng = createRng(20261008);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)]!;
  return Array.from({ length: n }, () => {
    const priorities = volumeGroups.filter(() => rng() < 0.12).slice(0, 3);
    return input({
      goal: pick(goals),
      level: pick(levels),
      schedule: pick(schedules),
      minutes: pick(sessionMinutes),
      cardio: rng() < 0.7,
      equipment: pick(equipments),
      priorities,
      avoid: avoidable.filter(() => rng() < 0.15).map(idOf),
      weeks: pick(planLengths),
    });
  });
}

const cases = sample(500).map((i) => ({ input: i, plan: generatePlan(i, ctx, { now: NOW }) }));

const counted = (e: RoutineExercise) => {
  const info = byId.get(e.exerciseId)!;
  return info.category === 'strength' || info.category === 'calisthenics';
};
const primaries = (exercises: readonly RoutineExercise[]): Set<Muscle> =>
  new Set(
    exercises.filter(counted).flatMap((e) =>
      byId
        .get(e.exerciseId)!
        .muscles.filter((m) => m.role === 'primary')
        .map((m) => m.muscle),
    ),
  );
const allRoutines = (plan: GeneratedPlan) =>
  plan.sessions.flatMap((s) => (s.deload ? [s.routine, s.deload] : [s.routine]));

describe('plan engine properties (500 sampled profiles)', () => {
  it('never puts the same primary muscle on consecutive calendar days', () => {
    for (const { plan } of cases) {
      const laid = schedulePlan(plan, {
        today: '2026-10-05',
        start: 'this_week',
        newId: ctx.newId,
      });
      const routines = new Map(allRoutines(plan).map((r) => [r.id, r]));
      const byDate = new Map(
        laid.days.map((d) => [d.date, primaries(routines.get(d.routineId!)!.exercises)]),
      );
      for (const [date, muscles] of byDate) {
        const next = byDate.get(addDays(date, 1));
        if (!next) continue;
        const shared = [...muscles].filter((m) => next.has(m));
        if (shared.length)
          throw new Error(`${plan.name} ${date}: ${shared.join(', ')} on back-to-back days`);
      }
    }
  });

  it('fits every session, deload weeks included, in the time budget', () => {
    for (const { input: i, plan } of cases) {
      for (const r of allRoutines(plan)) {
        expect(estimateDurationSec(r.exercises)).toBeLessThanOrEqual(i.minutes * 60);
      }
    }
  });

  it('keeps weekly sets under the ceiling, and explains any group below its floor', () => {
    for (const { plan } of cases) {
      for (const v of plan.volume) {
        expect(v.sets).toBeLessThanOrEqual(v.max + 0.01);
        if (v.sets < v.floor - 0.01) expect(v.shortfall).toEqual(expect.any(String));
      }
    }
  });

  it('respects equipment, bars and the avoid list', () => {
    for (const { input: i, plan } of cases) {
      const kit = availableEquipment(i.equipment);
      for (const r of allRoutines(plan)) {
        for (const e of r.exercises) {
          const info = byId.get(e.exerciseId)!;
          expect(kit.has(info.equipment as Equipment)).toBe(true);
          if (!hasBars(i.equipment)) expect(NEEDS_BARS.has(info.slug)).toBe(false);
          expect(i.avoid).not.toContain(e.exerciseId);
        }
      }
    }
  });

  it('puts compound lifts before isolation work', () => {
    for (const { plan } of cases) {
      for (const s of plan.sessions) {
        const mech = s.routine.exercises
          .filter(counted)
          .map((e) => byId.get(e.exerciseId)!.mechanic);
        const firstIso = mech.indexOf('isolation');
        if (firstIso >= 0) expect(mech.slice(firstIso)).not.toContain('compound');
      }
    }
  });

  it('builds routines the server accepts', () => {
    for (const { plan } of cases) {
      for (const r of allRoutines(plan)) {
        expect(validateRoutineDoc(r)).toEqual({ ok: true });
        expect(r.source).toBe('plan');
        expect(r.sourceRef).toBe(plan.id);
      }
    }
  });

  it('cuts deload sets to about 60% and leaves week-1 weights blank', () => {
    for (const { input: i, plan } of cases) {
      for (const s of plan.sessions) {
        expect(s.deload === null).toBe(i.weeks < 6);
        for (const r of allRoutines(plan))
          for (const e of r.exercises) for (const set of e.sets) expect(set.weightKg).toBeNull();
        if (!s.deload) continue;
        s.routine.exercises.forEach((e, k) => {
          const normal = e.sets.filter((x) => x.setType !== 'warmup').length;
          const light = s.deload!.exercises[k]!.sets.filter((x) => x.setType !== 'warmup').length;
          expect(light).toBe(deloadSetCount(normal));
        });
      }
    }
  });

  it('progresses beginners linearly and everyone else by double progression', () => {
    for (const { input: i, plan } of cases) {
      for (const s of plan.sessions) {
        for (const e of s.routine.exercises) {
          if (byId.get(e.exerciseId)!.logType !== 'weight_reps') continue;
          expect(parseRule(e.progressionRule)?.kind).toBe(
            i.level === 'beginner' ? 'linear' : 'double',
          );
        }
      }
    }
  });

  it('varies A and B sessions', () => {
    for (const { plan } of cases) {
      const families = new Map<string, string[]>();
      for (const s of plan.sessions) {
        const ids = s.routine.exercises.map((e) => e.exerciseId).join();
        const seen = families.get(s.family) ?? [];
        expect(ids).not.toBe('');
        if (seen.includes(ids))
          throw new Error(
            `${plan.name}: ${s.label} repeats another ${s.family} session\n${renderPlan(plan, library)}`,
          );
        families.set(s.family, [...seen, ids]);
      }
    }
  });

  it('is deterministic', () => {
    for (const { input: i, plan } of cases.slice(0, 40)) {
      expect(renderPlan(generatePlan(i, ctx, { now: NOW }), library)).toBe(
        renderPlan(plan, library),
      );
    }
  });
});

describe('with enough time and a full gym', () => {
  // Enough: 3+ days of 60+ min. Advanced lifters need 4+ days of 75+ min for 12+ sets, and
  // strength plans (2–4 min rests) 75+ min.
  const generous = sample(500)
    .filter((i) => i.goal !== 'calisthenics')
    .map((i) => {
      const advanced = i.level === 'advanced';
      const days = i.schedule.kind === 'count' ? i.schedule.days : i.schedule.weekdays.length;
      return {
        ...i,
        equipment: { preset: 'gym' as const, custom: [], bars: true },
        minutes: Math.max(
          advanced || i.goal === 'stronger' ? 75 : 60,
          i.minutes,
        ) as PlanInput['minutes'],
        schedule: { kind: 'count' as const, days: Math.max(advanced ? 4 : 3, days) },
        // The cardio finisher takes 15–20 min of the session.
        cardio: false,
        avoid: [],
      };
    });

  it('covers every movement pattern each week', () => {
    const needed = ['squat', 'hinge', 'lunge', 'h_push', 'v_push', 'h_pull', 'v_pull', 'core'];
    for (const i of generous) {
      const plan = generatePlan(i, ctx, { now: NOW });
      const covered = new Set(
        plan.sessions.flatMap((s) =>
          s.routine.exercises.filter(counted).map((e) => coveragePattern(byId.get(e.exerciseId)!)),
        ),
      );
      for (const p of needed) {
        if (!covered.has(p as never))
          throw new Error(`${plan.name} (${i.level}, ${i.minutes} min) misses ${p}`);
      }
    }
  });

  it('reaches the floor for every major muscle group', () => {
    const majors: VolumeGroup[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes'];
    for (const i of generous) {
      const plan = generatePlan(i, ctx, { now: NOW });
      for (const v of plan.volume.filter((x) => majors.includes(x.group))) {
        if (v.sets < v.floor)
          throw new Error(
            `${plan.name} (${i.level}, ${i.minutes} min): ${v.group} ${v.sets} < ${v.floor} [${i.priorities.join()}] ${v.shortfall}\n${renderPlan(plan, library)}`,
          );
      }
    }
  });
});

// Keeps the full equipment list in use (and the import honest) if presets change.
it('knows every equipment type', () => {
  expect(availableEquipment({ preset: 'gym', custom: [], bars: true }).size).toBe(
    equipmentTypes.length,
  );
});

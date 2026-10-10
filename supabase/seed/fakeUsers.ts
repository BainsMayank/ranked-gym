/**
 * 50 fake lifters with realistic training histories, to sanity-check the tier distribution
 * (docs/RANK_SYSTEM.md §14). Deterministic: the same seed always gives the same people.
 *
 * Strength is modelled from training age, independently of our standards, so the check means
 * something: each lift follows a curve of 1RM ÷ bodyweight by years trained, drawn from common
 * strength tables (beginners bench ~0.5× bodyweight, a year in ~1×, several years ~1.4×), scaled by
 * a talent factor, bodyweight (heavier people lift more kg but a smaller multiple) and sex.
 *
 * Used by the Jest distribution test (TypeScript mirror) and by `pnpm ranks:fake`, which writes the
 * pgTAP parity test that runs the same people through the Postgres engine.
 */
import type { RankKey } from '../../src/lib/game/rankKeys.ts';
import { computeRanks } from '../../src/lib/game/engine/compute.ts';
import { loadForE1rm } from '../../src/lib/game/engine/e1rm.ts';
import {
  TIERS,
  type BodyweightLog,
  type EngineSet,
  type ProfileSex,
  type RankConfig,
  type StandardsSex,
  type Tier,
} from '../../src/lib/game/engine/types.ts';
import type { ExerciseSeed } from './define.ts';
import { liftMusclesFromLibrary } from './standards.ts';

export const personaLevels = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'] as const;
export type PersonaLevel = (typeof personaLevels)[number];

export const LEVEL_LABELS: Record<PersonaLevel, string> = {
  beginner: '0–6 months',
  novice: '6–12 months',
  intermediate: '1–2 years',
  advanced: '3–5 years',
  elite: '8+ years',
};

/** One logged set: [exercise slug, weight kg | null, reps | null, seconds | null]. */
export type FakeSet = [
  slug: string,
  weightKg: number | null,
  reps: number | null,
  seconds: number | null,
];

export interface FakeWorkout {
  daysAgo: number;
  sets: FakeSet[];
}

export type FakeStyle = 'gym' | 'calisthenics' | 'hybrid';

export interface FakeUser {
  id: string;
  level: PersonaLevel;
  style: FakeStyle;
  sex: ProfileSex;
  age: number;
  bodyweightKg: number;
  trainingMonths: number;
  /** [days ago, kg] */
  bodyweights: [number, number][];
  workouts: FakeWorkout[];
}

// ─── Random numbers (mulberry32) ────────────────────────────────────────────────────────────────

function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (lo: number, hi: number) => lo + (hi - lo) * next(),
    int: (lo: number, hi: number) => Math.floor(lo + (hi - lo + 1) * next()),
    gauss: () => {
      const u = Math.max(next(), 1e-9);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    },
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
  };
}

// ─── Strength by training age ───────────────────────────────────────────────────────────────────

/** Years trained at which the curves below are given. */
const YEARS = [0, 0.5, 1, 2, 4, 8] as const;

/** Men's 1RM ÷ bodyweight at a 75 kg reference, by years trained. */
const MALE_RATIOS: Partial<Record<RankKey, readonly number[]>> = {
  benchPress: [0.5, 0.8, 1.0, 1.2, 1.4, 1.65],
  backSquat: [0.7, 1.1, 1.4, 1.65, 1.95, 2.3],
  deadlift: [0.9, 1.4, 1.7, 2.0, 2.35, 2.75],
  overheadPress: [0.35, 0.52, 0.65, 0.78, 0.92, 1.08],
  barbellRow: [0.45, 0.7, 0.88, 1.05, 1.25, 1.45],
  barbellCurl: [0.25, 0.38, 0.48, 0.58, 0.68, 0.8],
  romanianDeadlift: [0.6, 1.0, 1.3, 1.55, 1.85, 2.15],
  dumbbellBench: [0.2, 0.32, 0.4, 0.48, 0.56, 0.66],
};

/** Women relative to men on the same curve (upper body differs more than lower). */
const FEMALE_SCALE: Partial<Record<RankKey, number>> = {
  benchPress: 0.6,
  backSquat: 0.76,
  deadlift: 0.78,
  overheadPress: 0.6,
  barbellRow: 0.66,
  barbellCurl: 0.6,
  romanianDeadlift: 0.78,
  dumbbellBench: 0.6,
};

/** Clean reps (or seconds) by years trained, for calisthenics. */
const CALISTHENICS: Record<StandardsSex, Record<string, readonly number[]>> = {
  male: {
    pullUp: [1, 4, 8, 12, 17, 24],
    dip: [2, 8, 13, 18, 25, 32],
    pushUp: [10, 25, 35, 45, 60, 75],
    pistolSquat: [0, 1, 3, 6, 10, 15],
    lSit: [3, 8, 12, 18, 25, 35],
  },
  female: {
    pullUp: [0, 1, 3, 6, 9, 14],
    dip: [0, 2, 5, 9, 14, 20],
    pushUp: [2, 8, 15, 22, 30, 40],
    pistolSquat: [0, 1, 2, 4, 7, 11],
    lSit: [2, 6, 10, 15, 20, 28],
  },
};

const SLUGS: Partial<Record<RankKey, string>> = {
  benchPress: 'barbell-bench-press',
  backSquat: 'barbell-back-squat',
  deadlift: 'barbell-deadlift',
  overheadPress: 'barbell-overhead-press',
  barbellRow: 'barbell-bent-over-row',
  barbellCurl: 'barbell-curl',
  romanianDeadlift: 'barbell-romanian-deadlift',
  dumbbellBench: 'dumbbell-bench-press',
  pullUp: 'pull-up',
  dip: 'parallel-bar-dip',
  pushUp: 'push-up',
  pistolSquat: 'pistol-squat',
  lSit: 'l-sit',
};

function atYears(curve: readonly number[], years: number): number {
  if (years <= 0) return curve[0] ?? 0;
  for (let i = 1; i < YEARS.length; i += 1) {
    const y0 = YEARS[i - 1] ?? 0;
    const y1 = YEARS[i] ?? 0;
    if (years <= y1) {
      const a = curve[i - 1] ?? 0;
      const b = curve[i] ?? 0;
      return a + ((b - a) * (years - y0)) / (y1 - y0);
    }
  }
  return curve[curve.length - 1] ?? 0;
}

/** Front lever progression and hold by years trained (calisthenics people only). */
function frontLever(years: number, talent: number): FakeSet {
  const y = years * talent;
  if (y < 1) return ['tuck-front-lever', null, null, Math.round(5 + 10 * y)];
  if (y < 2) return ['advanced-tuck-front-lever', null, null, Math.round(5 + 5 * (y - 1))];
  if (y < 4) return ['straddle-front-lever', null, null, Math.round(3 + 2.5 * (y - 2))];
  return ['front-lever', null, null, Math.round(2 + 1.5 * (y - 4))];
}

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);

// ─── People ─────────────────────────────────────────────────────────────────────────────────────

const PLAN: { level: PersonaLevel; count: number; months: [number, number] }[] = [
  { level: 'beginner', count: 20, months: [1, 6] },
  { level: 'novice', count: 12, months: [6, 12] },
  { level: 'intermediate', count: 12, months: [12, 24] },
  { level: 'advanced', count: 5, months: [36, 60] },
  { level: 'elite', count: 1, months: [96, 120] },
];

const HISTORY_DAYS = 240;

function uuidFor(n: number): string {
  return `fa4e0000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}

export function makeFakeUsers(seed = 20261008): FakeUser[] {
  const r = rng(seed);
  const users: FakeUser[] = [];
  let n = 0;
  for (const { level, count, months } of PLAN) {
    for (let i = 0; i < count; i += 1) {
      n += 1;
      // 30 men, 15 women, 5 "rather not say" overall (assigned round-robin by index).
      const sex: ProfileSex = n % 10 === 0 ? 'unspecified' : n % 10 < 7 ? 'male' : 'female';
      const body: StandardsSex = sex === 'unspecified' ? (n % 20 === 0 ? 'female' : 'male') : sex;
      const style = n % 9 === 4 ? 'calisthenics' : 'gym';
      const age = r.int(level === 'beginner' ? 16 : 18, level === 'elite' ? 34 : 52);
      const bodyweightKg =
        Math.round(body === 'male' ? r.between(58, 98) : r.between(47, 78)) +
        (level === 'advanced' || level === 'elite' ? 6 : 0);
      const trainingMonths = Math.round(r.between(months[0], months[1]));
      const talent = Math.min(1.25, Math.max(0.8, 1 + 0.1 * r.gauss()));
      users.push(
        buildHistory(r, {
          id: uuidFor(n),
          level,
          style,
          sex,
          body,
          age,
          bodyweightKg,
          trainingMonths,
          talent,
        }),
      );
    }
  }
  return users;
}

/**
 * The dev seed's demo account (`pnpm dev:seed`): a man about 14 months in who trains barbell and
 * calisthenics lifts three times a week, so every Rank sub-tab has something to show. Separate
 * from makeFakeUsers(), which the parity test pins.
 */
export function makeDemoUser(id: string, seed = 7): FakeUser {
  return buildHistory(rng(seed), {
    id,
    level: 'intermediate',
    style: 'hybrid',
    sex: 'male',
    body: 'male',
    age: 21,
    bodyweightKg: 74,
    trainingMonths: 14,
    talent: 1.05,
  });
}

interface Profile {
  id: string;
  level: PersonaLevel;
  style: FakeStyle;
  sex: ProfileSex;
  body: StandardsSex;
  age: number;
  bodyweightKg: number;
  trainingMonths: number;
  talent: number;
}

function buildHistory(r: ReturnType<typeof rng>, p: Profile): FakeUser {
  const trainedDays = Math.round(p.trainingMonths * 30.4);
  const startDaysAgo = Math.min(HISTORY_DAYS, trainedDays);
  const gymLifts: RankKey[] = [
    'benchPress',
    'backSquat',
    'deadlift',
    'overheadPress',
    'barbellRow',
  ];
  if (r.next() < 0.6) gymLifts.push('barbellCurl');
  if (r.next() < 0.4) gymLifts.push('romanianDeadlift');
  if (r.next() < 0.3) gymLifts.push('dumbbellBench');
  const lifts: string[] =
    p.style === 'gym'
      ? [...gymLifts, 'pullUp']
      : p.style === 'hybrid'
        ? [...gymLifts, 'pullUp', 'dip', 'pushUp', 'lSit']
        : ['pullUp', 'dip', 'pushUp', 'pistolSquat', 'lSit', 'frontLever'];
  const liftNoise = new Map(lifts.map((l) => [l, 1 + 0.05 * r.gauss()]));
  const ref = p.body === 'male' ? 75 : 60;
  const allometry = (ref / p.bodyweightKg) ** (1 / 3);

  const bodyweights: [number, number][] = [];
  for (let d = startDaysAgo + 3; d >= 0; d -= 14) {
    bodyweights.push([d, Math.round((p.bodyweightKg + r.between(-1.5, 1.5)) * 10) / 10]);
  }

  const workouts: FakeWorkout[] = [];
  const perWeek = p.level === 'beginner' ? 2 : 3;
  let rotation = 0;
  for (let d = startDaysAgo; d >= 1; d -= Math.round(7 / perWeek)) {
    const years = Math.max(0, (trainedDays - d) / 365);
    const sets: FakeSet[] = [];
    const today = [0, 1, 2, 3].map((k) => lifts[(rotation + k) % lifts.length] as string);
    rotation += 3;
    for (const key of today) {
      const noise = (liftNoise.get(key) ?? 1) * p.talent * (1 + 0.03 * r.gauss());
      const male = MALE_RATIOS[key as RankKey];
      if (male) {
        const scale = p.body === 'female' ? (FEMALE_SCALE[key as RankKey] ?? 0.7) : 1;
        const e1rm = atYears(male, years) * scale * noise * allometry * p.bodyweightKg;
        const reps = r.pick([3, 5, 5, 8]);
        const step = key === 'dumbbellBench' ? 1 : 2.5;
        sets.push([
          SLUGS[key as RankKey] ?? key,
          roundTo(loadForE1rm(e1rm * 0.97, reps), step),
          reps,
          null,
        ]);
        continue;
      }
      if (key === 'frontLever') {
        sets.push(frontLever(years, p.talent));
        continue;
      }
      const reps = Math.floor(atYears(CALISTHENICS[p.body][key] ?? [0], years) * noise);
      if (reps < 1) continue;
      sets.push(
        key === 'lSit'
          ? ['l-sit', null, null, reps]
          : [SLUGS[key as RankKey] ?? key, 0, reps, null],
      );
    }
    if (sets.length > 0) workouts.push({ daysAgo: d, sets });
  }

  return {
    id: p.id,
    level: p.level,
    style: p.style,
    sex: p.sex,
    age: p.age,
    bodyweightKg: p.bodyweightKg,
    trainingMonths: p.trainingMonths,
    bodyweights,
    workouts,
  };
}

// ─── As engine input ────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000;
const MINUTE = 60_000;

/** The user's sets as the engine sees them, relative to `nowMs` (same layout as the SQL test). */
export function engineSets(
  user: FakeUser,
  library: readonly ExerciseSeed[],
  variants: ReadonlyMap<string, RankKey>,
  nowMs: number,
): EngineSet[] {
  const bySlug = new Map(library.map((e) => [e.slug, e]));
  return user.workouts.flatMap((w, wi) =>
    w.sets.map(([slug, weightKg, reps, seconds], si): EngineSet => {
      const e = bySlug.get(slug);
      if (!e) throw new Error(`Unknown slug ${slug}`);
      return {
        id: `${user.id}:${wi}:${si}`,
        workoutId: `${user.id}:${wi}`,
        exerciseId: slug,
        rankKey: e.rankKey ?? variants.get(slug) ?? null,
        variant: variants.has(slug) ? slug : '',
        logType: e.logType,
        weightMode: e.logType === 'weight_reps' ? 'absolute' : 'bodyweight',
        setType: 'working',
        completed: true,
        failed: false,
        weightKg,
        reps,
        durationSec: seconds,
        at: nowMs - w.daysAgo * DAY + si * MINUTE,
        order: si * 1000,
      };
    }),
  );
}

export function engineBodyweights(user: FakeUser, nowMs: number): BodyweightLog[] {
  return user.bodyweights.map(([daysAgo, weightKg]) => ({ weightKg, at: nowMs - daysAgo * DAY }));
}

/** Birth year that gives this age in the year of `now` (the engine only knows the year). */
export function birthYearFor(age: number, now: Date): number {
  return now.getUTCFullYear() - age;
}

// ─── Ranking them ───────────────────────────────────────────────────────────────────────────────

export interface FakeResult {
  user: FakeUser;
  /** `scope:key` → score (null while placement isn't done). */
  scores: Record<string, number | null>;
  overallTier: Tier | null;
}

export function rankFakeUsers(
  users: readonly FakeUser[],
  config: RankConfig,
  library: readonly ExerciseSeed[],
  now: Date,
): FakeResult[] {
  const variants = new Map(config.variants.map((v) => [v.slug, v.rankKey]));
  const liftMuscles = liftMusclesFromLibrary(library);
  return users.map((user) => {
    const result = computeRanks({
      config,
      sets: engineSets(user, library, variants, now.getTime()),
      bodyweights: engineBodyweights(user, now.getTime()),
      sex: user.sex,
      birthYear: birthYearFor(user.age, now),
      now,
      liftMuscles,
    });
    const scores: Record<string, number | null> = {};
    for (const e of result.entries) {
      if (
        e.scope === 'lift' ||
        e.scope === 'overall' ||
        e.scope === 'weightlifting' ||
        e.scope === 'calisthenics'
      ) {
        scores[`${e.scope}:${e.key}`] = e.score;
      }
    }
    const overall = result.entries.find((e) => e.scope === 'overall');
    return { user, scores, overallTier: overall?.tier ?? null };
  });
}

/** Overall tier counts per experience level, as printable lines. */
export function distributionTable(results: readonly FakeResult[]): string[] {
  const tiers = [...TIERS, null] as const;
  const head = [
    'Level'.padEnd(22),
    ...tiers.map((t) => (t ?? 'unplaced').slice(0, 8).padStart(9)),
  ].join('');
  const lines = [head];
  for (const level of personaLevels) {
    const rows = results.filter((r) => r.user.level === level);
    lines.push(
      [
        `${level} (${LEVEL_LABELS[level]})`.padEnd(22),
        ...tiers.map((t) =>
          String(rows.filter((r) => r.overallTier === t).length || '·').padStart(9),
        ),
      ].join(''),
    );
  }
  lines.push(
    [
      'All'.padEnd(22),
      ...tiers.map((t) =>
        String(results.filter((r) => r.overallTier === t).length || '·').padStart(9),
      ),
    ].join(''),
  );
  return lines;
}

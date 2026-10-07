/**
 * Checks on the official exercise library. Each check returns a list of problems (empty = fine).
 * Run by the seed generator before it writes SQL, and by the Jest validation test.
 */
import {
  equipmentTypes,
  exerciseCategories,
  isOptionalMuscle,
  isValidRoleWeight,
  logTypes,
  mechanics,
  muscles,
  type LogType,
} from '../../src/lib/exercises/taxonomy.ts';
import { isRankKey } from '../../src/lib/game/rankKeys.ts';
import type { ExerciseSeed } from './define.ts';

export const MIN_EXERCISES = 250;
export const MIN_RANKABLE = 30;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BODYWEIGHT_LOG_TYPES: readonly LogType[] = [
  'bodyweight_reps',
  'weighted_bodyweight',
  'assisted_bodyweight',
  'duration',
  'distance_duration',
];

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

export function checkSize(list: ExerciseSeed[]): string[] {
  return list.length >= MIN_EXERCISES
    ? []
    : [`Only ${list.length} exercises; need at least ${MIN_EXERCISES}.`];
}

export function checkUniqueness(list: ExerciseSeed[]): string[] {
  return [
    ...duplicates(list.map((e) => e.slug)).map((s) => `Duplicate slug "${s}".`),
    ...duplicates(list.map((e) => normalise(e.name))).map((n) => `Duplicate name "${n}".`),
  ];
}

export function checkFields(list: ExerciseSeed[]): string[] {
  const problems: string[] = [];
  for (const e of list) {
    const at = `"${e.slug}"`;
    if (!SLUG.test(e.slug) || e.slug.length > 80) problems.push(`${at}: bad slug.`);
    if (e.name.trim().length < 2 || e.name.length > 60) problems.push(`${at}: name length.`);
    if (!exerciseCategories.includes(e.category)) problems.push(`${at}: bad category.`);
    if (!equipmentTypes.includes(e.equipment)) problems.push(`${at}: bad equipment.`);
    if (!mechanics.includes(e.mechanic)) problems.push(`${at}: bad mechanic.`);
    if (!logTypes.includes(e.logType)) problems.push(`${at}: bad log type.`);
    if (e.instructions.length === 0) problems.push(`${at}: no instructions.`);
    if ([...e.instructions, ...e.tips, ...e.mistakes].some((line) => line.trim() === '')) {
      problems.push(`${at}: empty text line.`);
    }
    if (!(e.met >= 1 && e.met <= 20)) problems.push(`${at}: MET ${e.met} out of range.`);
  }
  return problems;
}

export function checkMuscles(list: ExerciseSeed[]): string[] {
  const problems: string[] = [];
  for (const e of list) {
    const at = `"${e.slug}"`;
    if (!e.muscles.some((m) => m.role === 'primary')) problems.push(`${at}: no primary muscle.`);
    for (const dupe of duplicates(e.muscles.map((m) => m.muscle))) {
      problems.push(`${at}: ${dupe} listed twice.`);
    }
    for (const m of e.muscles) {
      if (!muscles.includes(m.muscle)) problems.push(`${at}: unknown muscle ${m.muscle}.`);
      if (!isValidRoleWeight(m.role, m.weight)) {
        problems.push(`${at}: ${m.muscle} has weight ${m.weight} for role ${m.role}.`);
      }
      // Optional muscles (neck) only appear on exercises that train nothing else.
      if (isOptionalMuscle(m.muscle) && e.muscles.length > 1) {
        problems.push(`${at}: optional muscle ${m.muscle} mixed with others.`);
      }
    }
  }
  return problems;
}

export function checkRankKeys(list: ExerciseSeed[]): string[] {
  const keys = list.flatMap((e) => (e.rankKey ? [e.rankKey] : []));
  const problems = duplicates(keys).map((k) => `Rank key "${k}" used twice.`);
  for (const e of list) {
    if (e.rankKey === null) continue;
    if (!isRankKey(e.rankKey)) problems.push(`"${e.slug}": unknown rank key ${e.rankKey}.`);
    if (e.category !== 'strength' && e.category !== 'calisthenics') {
      problems.push(`"${e.slug}": only strength and calisthenics exercises rank.`);
    }
    if (['machine', 'cable', 'smith'].includes(e.equipment)) {
      problems.push(`"${e.slug}": machines don't rank (RANK_SYSTEM.md §4.3).`);
    }
  }
  if (keys.length < MIN_RANKABLE) {
    problems.push(`Only ${keys.length} rankable exercises; need at least ${MIN_RANKABLE}.`);
  }
  return problems;
}

/** Aliases must not shadow another exercise's name, and should add something. */
export function checkAliases(list: ExerciseSeed[]): string[] {
  const owner = new Map(list.map((e) => [normalise(e.name), e.slug]));
  const problems: string[] = [];
  for (const e of list) {
    for (const alias of e.aliases) {
      const key = normalise(alias);
      if (key === '') problems.push(`"${e.slug}": empty alias.`);
      const other = owner.get(key);
      if (other === e.slug) problems.push(`"${e.slug}": alias "${alias}" repeats its name.`);
      else if (other) problems.push(`"${e.slug}": alias "${alias}" is the name of "${other}".`);
    }
    for (const dupe of duplicates(e.aliases.map(normalise))) {
      problems.push(`"${e.slug}": alias "${dupe}" listed twice.`);
    }
  }
  return problems;
}

/** The log type has to make sense for the equipment and category. */
export function checkLogTypes(list: ExerciseSeed[]): string[] {
  const problems: string[] = [];
  for (const e of list) {
    const at = `"${e.slug}"`;
    if (e.equipment === 'bodyweight' && !BODYWEIGHT_LOG_TYPES.includes(e.logType)) {
      problems.push(`${at}: bodyweight exercises can't log weight × reps.`);
    }
    if (e.logType === 'weighted_bodyweight' && e.equipment !== 'bodyweight') {
      problems.push(`${at}: weighted bodyweight needs bodyweight equipment.`);
    }
    if (
      e.logType === 'assisted_bodyweight' &&
      !['bodyweight', 'machine', 'band'].includes(e.equipment)
    ) {
      problems.push(`${at}: assisted bodyweight needs bodyweight, machine or band.`);
    }
    if (e.category === 'cardio' && !['duration', 'distance_duration'].includes(e.logType)) {
      problems.push(`${at}: cardio logs duration or distance.`);
    }
  }
  return problems;
}

export function validateLibrary(list: ExerciseSeed[]): string[] {
  return [
    ...checkSize(list),
    ...checkUniqueness(list),
    ...checkFields(list),
    ...checkMuscles(list),
    ...checkRankKeys(list),
    ...checkAliases(list),
    ...checkLogTypes(list),
  ];
}

import type { Equipment, ExerciseCategory, Muscle } from './taxonomy';
import type { Exercise } from './types';

/**
 * Offline exercise search: fuzzy matching on names and aliases (prefixes, typos, "latpull" with
 * no space), ranked so the common lift wins ("bench" → barbell bench press). Pure; runs in memory
 * over the local library (~300 exercises), so no index library is needed.
 */

export interface ExerciseFilters {
  muscles: readonly Muscle[];
  equipment: readonly Equipment[];
  categories: readonly ExerciseCategory[];
}

export const NO_FILTERS: ExerciseFilters = { muscles: [], equipment: [], categories: [] };

/** Lowercase, no accents or apostrophes, punctuation as spaces ("Farmer's carry" → "farmers carry"). */
export function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const tokenise = (text: string) => normaliseText(text).split(' ').filter(Boolean);

interface Indexed {
  exercise: Exercise;
  name: string;
  nameTokens: string[];
  nameCompact: string;
  aliases: string[];
  aliasTokens: string[][];
  aliasCompacts: string[];
  allTokens: string[];
}

export type SearchIndex = Indexed[];

export function buildSearchIndex(exercises: readonly Exercise[]): SearchIndex {
  return exercises.map((exercise) => {
    const name = normaliseText(exercise.name);
    const aliases = exercise.aliases.map(normaliseText).filter(Boolean);
    const nameTokens = name.split(' ');
    const aliasTokens = aliases.map((a) => a.split(' '));
    return {
      exercise,
      name,
      nameTokens,
      nameCompact: name.replace(/ /g, ''),
      aliases,
      aliasTokens,
      aliasCompacts: aliases.map((a) => a.replace(/ /g, '')),
      allTokens: [...nameTokens, ...aliasTokens.flat()],
    };
  });
}

/** Optimal string alignment distance (Levenshtein + adjacent swaps), stopping early past `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (prevPrev[j - 2] ?? 0) + 1);
      }
      row.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length] ?? max + 1;
}

/** How well one query token matches one word: exact 1, prefix .85, inside .6, typo ≤ .5. */
function tokenScore(query: string, word: string): number {
  if (word === query) return 1;
  if (word.startsWith(query)) return 0.85;
  if (query.length >= 3 && word.includes(query)) return 0.6;
  if (query.length < 4) return 0;
  const max = query.length >= 7 ? 2 : 1;
  const distance = editDistance(query, word, max);
  if (distance <= max) return 0.5 - 0.1 * (distance - 1);
  // A typo inside a prefix: "pulldwn" → "pulldown".
  if (word.length > query.length && editDistance(query, word.slice(0, query.length), 1) <= 1) {
    return 0.4;
  }
  return 0;
}

/** Every query token must match some word; the score is their average (0 if any misses). */
function fieldScore(query: string[], words: string[]): number {
  let total = 0;
  for (const q of query) {
    let best = 0;
    for (const word of words) best = Math.max(best, tokenScore(q, word));
    if (best === 0) return 0;
    total += best;
  }
  return total / query.length;
}

function textScore(entry: Indexed, query: string, queryTokens: string[]): number {
  const compactQuery = query.replace(/ /g, '');
  let score = fieldScore(queryTokens, entry.nameTokens);
  if (score > 0 && tokenScore(queryTokens[0] ?? '', entry.nameTokens[0] ?? '') >= 0.85) {
    score += 0.05;
  }
  for (const tokens of entry.aliasTokens)
    score = Math.max(score, 0.9 * fieldScore(queryTokens, tokens));
  // Words split between the name and aliases ("pec deck machine").
  score = Math.max(score, 0.75 * fieldScore(queryTokens, entry.allTokens));
  if (compactQuery.length >= 4) {
    if (entry.nameCompact.includes(compactQuery)) {
      score = Math.max(score, entry.nameCompact.startsWith(compactQuery) ? 0.85 : 0.75);
    }
    if (entry.aliasCompacts.some((a) => a.includes(compactQuery))) score = Math.max(score, 0.7);
  }
  if (score === 0) return 0;
  if (entry.name === query) score += 0.5;
  else if (entry.aliases.includes(query)) score += 0.3;
  return score;
}

function matchesFilters(exercise: Exercise, filters: ExerciseFilters): boolean {
  if (filters.equipment.length > 0 && !filters.equipment.includes(exercise.equipment)) return false;
  if (filters.categories.length > 0 && !filters.categories.includes(exercise.category))
    return false;
  if (filters.muscles.length > 0) {
    // A muscle counts when the exercise really trains it: primary, or a full secondary mover.
    return exercise.muscles.some(
      (m) =>
        filters.muscles.includes(m.muscle) &&
        (m.role === 'primary' || (m.role === 'secondary' && m.weight >= 0.5)),
    );
  }
  return true;
}

function trainsAsPrimary(exercise: Exercise, filters: ExerciseFilters): boolean {
  return exercise.muscles.some((m) => m.role === 'primary' && filters.muscles.includes(m.muscle));
}

export interface SearchOptions {
  filters?: ExerciseFilters;
  /** Pick counts by exercise id: frequently used exercises rank a little higher. */
  usage?: ReadonlyMap<string, number>;
  limit?: number;
}

/**
 * Exercises matching `query` and the filters, best first. With an empty query, every exercise that
 * passes the filters, primary movers first, then A–Z.
 */
export function searchExercises(
  index: SearchIndex,
  query: string,
  { filters = NO_FILTERS, usage, limit }: SearchOptions = {},
): Exercise[] {
  const normalised = normaliseText(query);
  const queryTokens = tokenise(query);
  const scored: { exercise: Exercise; score: number }[] = [];

  for (const entry of index) {
    const { exercise } = entry;
    if (!matchesFilters(exercise, filters)) continue;
    let score = 0;
    if (queryTokens.length > 0) {
      score = textScore(entry, normalised, queryTokens);
      if (score === 0) continue;
      if (exercise.isRankable) score += 0.08;
      score += Math.min(0.1, Math.log1p(usage?.get(exercise.id) ?? 0) * 0.03);
    } else if (filters.muscles.length > 0 && trainsAsPrimary(exercise, filters)) {
      score = 1;
    }
    scored.push({ exercise, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.exercise.name.length - b.exercise.name.length ||
      a.exercise.name.localeCompare(b.exercise.name),
  );
  if (queryTokens.length === 0) {
    scored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
  }
  const results = scored.map((s) => s.exercise);
  return limit === undefined ? results : results.slice(0, limit);
}

import { useDeferredValue, useMemo, useState } from 'react';

import {
  buildSearchIndex,
  isCustomExercise,
  NO_FILTERS,
  searchExercises,
  useExercises,
  useExerciseUsage,
  type Exercise,
  type ExerciseFilters,
} from '@/lib/exercises';

export interface ExerciseSection {
  key: string;
  title: string;
  data: Exercise[];
}

const RECENT = 5;
const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name);

/**
 * Search, filter and section state for the library and the picker. With no query or filters it
 * shows Recent, Most used, your custom exercises and then everything A–Z.
 */
export function useExerciseBrowser() {
  const library = useExercises();
  const { data: usage = [] } = useExerciseUsage();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ExerciseFilters>(NO_FILTERS);
  const deferredQuery = useDeferredValue(query);

  const exercises = useMemo(() => library.data ?? [], [library.data]);
  const index = useMemo(() => buildSearchIndex(exercises), [exercises]);
  const usageCounts = useMemo(() => new Map(usage.map((u) => [u.exerciseId, u.useCount])), [usage]);
  const filtering =
    deferredQuery.trim() !== '' ||
    filters.muscles.length + filters.equipment.length + filters.categories.length > 0;

  const sections = useMemo<ExerciseSection[]>(() => {
    if (filtering) {
      const data = searchExercises(index, deferredQuery, { filters, usage: usageCounts });
      const title = `${data.length} ${data.length === 1 ? 'exercise' : 'exercises'}`;
      return data.length > 0 ? [{ key: 'results', title, data }] : [];
    }
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const pick = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? []);
    const recent = pick(usage.slice(0, RECENT).map((u) => u.exerciseId));
    const recentIds = new Set(recent.map((e) => e.id));
    const frequent = pick(
      [...usage]
        .filter((u) => u.useCount > 1 && !recentIds.has(u.exerciseId))
        .sort((a, b) => b.useCount - a.useCount)
        .slice(0, RECENT)
        .map((u) => u.exerciseId),
    );
    const custom = exercises.filter(isCustomExercise).sort(byName);
    return [
      { key: 'recent', title: 'Recent', data: recent },
      { key: 'frequent', title: 'Most used', data: frequent },
      { key: 'custom', title: 'Your exercises', data: custom },
      { key: 'all', title: 'All exercises', data: [...exercises].sort(byName) },
    ].filter((s) => s.data.length > 0);
  }, [filtering, index, deferredQuery, filters, usageCounts, exercises, usage]);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    filtering,
    sections,
    /** Changes whenever the visible results change because of the search or filters. */
    resultsKey: `${deferredQuery}|${filters.muscles.join()}|${filters.equipment.join()}|${filters.categories.join()}`,
    isEmptyLibrary: library.isSuccess && exercises.length === 0,
    isLoading: library.isPending,
  };
}

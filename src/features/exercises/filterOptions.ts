import {
  categoryLabels,
  equipmentLabels,
  equipmentTypes,
  exerciseCategories,
  muscleLabels,
  muscleRegions,
  MUSCLES_BY_REGION,
  regionLabels,
  type Equipment,
  type ExerciseCategory,
  type Muscle,
} from '@/lib/exercises';

import type { FilterSection } from './components/FilterSheet';

/** Muscles grouped by body region. Optional muscles (neck) are left out by default. */
export const muscleSections: FilterSection<Muscle>[] = muscleRegions.map((region) => ({
  title: regionLabels[region],
  options: MUSCLES_BY_REGION[region].map((m) => ({ value: m, label: muscleLabels[m] })),
}));

export const equipmentSections: FilterSection<Equipment>[] = [
  { options: equipmentTypes.map((e) => ({ value: e, label: equipmentLabels[e] })) },
];

export const categorySections: FilterSection<ExerciseCategory>[] = [
  { options: exerciseCategories.map((c) => ({ value: c, label: categoryLabels[c] })) },
];

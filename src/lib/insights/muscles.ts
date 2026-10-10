import { muscleLabels, muscles, type Muscle } from '@/lib/exercises/taxonomy';
import { GROUP_MUSCLES, LEVEL_RANGES, groupBounds, groupRoles } from '@/lib/plans/engine/volume';
import type { PlanGoal, PlanLevel, VolumeGroup } from '@/lib/plans/engine/types';

import type { Analytics } from './schema';

export function muscleRows(
  data: Analytics,
  level: PlanLevel,
  goal: PlanGoal,
  priorities: readonly VolumeGroup[] = [],
) {
  const days = Math.max(1, (Date.parse(data.end) - Date.parse(data.start)) / 86400000);
  const roles = groupRoles(goal, priorities);
  return muscles
    .filter((m) => m !== 'neck')
    .map((muscle) => {
      const row = data.muscles.find((r) => r.muscle === muscle);
      const group = (Object.keys(GROUP_MUSCLES) as VolumeGroup[]).find((g) =>
        GROUP_MUSCLES[g].includes(muscle),
      );
      const bounds = group ? groupBounds(roles[group], level) : null;
      const weekly = ((row?.sets ?? 0) * 7) / days;
      const min = bounds?.floor ?? null,
        max = bounds?.max ?? null;
      return {
        muscle,
        label: muscleLabels[muscle],
        sets: row?.sets ?? 0,
        volume: row?.volume ?? 0,
        weekly,
        min,
        max,
        status:
          min === null || max === null
            ? 'No range'
            : weekly < min
              ? 'Under'
              : weekly > max
                ? 'Over'
                : 'In range',
      };
    })
    .sort((a, b) => b.sets - a.sets);
}
const push: readonly Muscle[] = [
  'upper_chest',
  'mid_lower_chest',
  'front_delts',
  'side_delts',
  'triceps',
];
const pull: readonly Muscle[] = ['lats', 'upper_back', 'rear_delts', 'biceps', 'forearms', 'traps'];
const legs: readonly Muscle[] = [
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'abductors',
  'calves',
];
export function muscleBalance(data: Analytics) {
  return [
    ['Push', push],
    ['Pull', pull],
    ['Legs', legs],
  ].map(([label, group]) => ({
    label: label as string,
    value: data.muscles
      .filter((m) => (group as readonly Muscle[]).includes(m.muscle))
      .reduce((s, m) => s + m.sets, 0),
  }));
}
export { LEVEL_RANGES };

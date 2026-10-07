import { Constants } from '@/types/database';

import {
  equipmentTypes,
  exerciseCategories,
  logTypes,
  mechanics,
  muscleRegion,
  muscleRegions,
  muscleRoles,
  muscles,
  MUSCLES_BY_REGION,
  OPTIONAL_MUSCLES,
} from '../taxonomy';

const enums = Constants.public.Enums;

describe('exercise taxonomy', () => {
  it('matches the Postgres enums exactly', () => {
    expect([...muscles]).toEqual([...enums.muscle]);
    expect([...muscleRegions]).toEqual([...enums.muscle_region]);
    expect([...exerciseCategories]).toEqual([...enums.exercise_category]);
    expect([...equipmentTypes]).toEqual([...enums.equipment]);
    expect([...mechanics]).toEqual([...enums.exercise_mechanic]);
    expect([...logTypes]).toEqual([...enums.exercise_log_type]);
    expect([...muscleRoles]).toEqual([...enums.muscle_role]);
  });

  it('puts every muscle in exactly one region, except optional ones', () => {
    const grouped = Object.values(MUSCLES_BY_REGION).flat();
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped, ...OPTIONAL_MUSCLES].sort()).toEqual([...muscles].sort());
    expect(muscleRegion('lats')).toBe('back');
    expect(muscleRegion('neck')).toBeNull();
  });
});

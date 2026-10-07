import { exercises, LIBRARY_VERSION } from '../exercises.ts';
import {
  checkAliases,
  checkFields,
  checkLogTypes,
  checkMuscles,
  checkRankKeys,
  checkSize,
  checkUniqueness,
  MIN_EXERCISES,
  MIN_RANKABLE,
} from '../validate.ts';

describe('official exercise library', () => {
  it(`has at least ${MIN_EXERCISES} exercises and a library version`, () => {
    expect(checkSize(exercises)).toEqual([]);
    expect(LIBRARY_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('has no duplicate slugs or names', () => {
    expect(checkUniqueness(exercises)).toEqual([]);
  });

  it('has valid fields, instructions and MET values', () => {
    expect(checkFields(exercises)).toEqual([]);
  });

  it('gives every exercise a primary muscle and valid role weights', () => {
    expect(checkMuscles(exercises)).toEqual([]);
  });

  it(`has at least ${MIN_RANKABLE} rankable lifts with unique, known rank keys`, () => {
    expect(checkRankKeys(exercises)).toEqual([]);
  });

  it('has aliases that never shadow another exercise', () => {
    expect(checkAliases(exercises)).toEqual([]);
  });

  it('uses log types that fit the equipment', () => {
    expect(checkLogTypes(exercises)).toEqual([]);
  });

  it('includes the gym staples', () => {
    const slugs = new Set(exercises.map((e) => e.slug));
    for (const slug of [
      'hack-squat',
      'pendulum-squat',
      'seated-cable-row',
      'smith-machine-squat',
      'barbell-hip-thrust',
      'dumbbell-bulgarian-split-squat',
      'pull-up',
      'chin-up',
      'parallel-bar-dip',
      'push-up',
      'pistol-squat',
      'muscle-up',
      'front-lever',
      'full-planche',
      'machine-fly',
    ]) {
      expect(slugs).toContain(slug);
    }
  });

  it('catches broken data', () => {
    const [first] = exercises;
    if (!first) throw new Error('empty library');
    const broken = {
      ...first,
      muscles: [{ muscle: 'quads' as const, role: 'secondary' as const, weight: 1 }],
    };
    expect(checkMuscles([broken])).toHaveLength(2);
    expect(checkUniqueness([first, first])).toHaveLength(2);
  });
});

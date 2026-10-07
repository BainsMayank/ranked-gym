import { exercises as seed } from '../../../../supabase/seed/exercises.ts';
import { buildSearchIndex, editDistance, normaliseText, searchExercises } from '../search';
import type { Exercise } from '../types';

// The real official library, shaped as the app stores it.
const library: Exercise[] = seed.map((e) => ({
  id: e.slug,
  slug: e.slug,
  name: e.name,
  aliases: e.aliases,
  category: e.category,
  equipment: e.equipment,
  mechanic: e.mechanic,
  logType: e.logType,
  unilateral: e.unilateral,
  instructions: e.instructions,
  tips: e.tips,
  commonMistakes: e.mistakes,
  mediaUrl: null,
  metValue: e.met,
  isRankable: e.rankKey !== null,
  rankKey: e.rankKey,
  createdBy: null,
  updatedAt: '2026-10-06T00:00:00Z',
  muscles: e.muscles,
}));
const index = buildSearchIndex(library);
const top = (query: string, n = 3) =>
  searchExercises(index, query, { limit: n }).map((e) => e.slug);

describe('exercise search', () => {
  it('puts the barbell bench press first for "bench"', () => {
    expect(top('bench')[0]).toBe('barbell-bench-press');
    expect(top('bench', 8)).toEqual(
      expect.arrayContaining(['dumbbell-bench-press', 'barbell-incline-bench-press']),
    );
  });

  it('finds the Romanian deadlift from "rdl"', () => {
    expect(top('rdl')[0]).toBe('barbell-romanian-deadlift');
    expect(top('rdl', 5)).toContain('dumbbell-romanian-deadlift');
  });

  it('finds lat pulldowns from "lat pull", with or without the space', () => {
    expect(top('lat pull')[0]).toBe('lat-pulldown');
    expect(top('lat pull', 5).every((slug) => slug.includes('pulldown'))).toBe(true);
    expect(top('latpull')[0]).toBe('lat-pulldown');
  });

  it('knows Indian gym names: "pec deck" is the machine fly', () => {
    expect(top('pec deck')[0]).toBe('machine-fly');
    expect(top('dand')[0]).toBe('hindu-push-up');
    expect(top('baithak')[0]).toBe('hindu-squat');
  });

  it('tolerates typos and partial words', () => {
    expect(top('squart', 5)).toContain('barbell-back-squat');
    expect(top('bicep curl')[0]).toBe('dumbbell-curl');
    expect(top('pulldwn', 5)).toContain('lat-pulldown');
    expect(top('hip thr')[0]).toBe('barbell-hip-thrust');
  });

  it('returns nothing for nonsense', () => {
    expect(top('zzzzqq')).toEqual([]);
  });

  it('filters by muscle, equipment and category', () => {
    const chestMachines = searchExercises(index, '', {
      filters: { muscles: ['mid_lower_chest'], equipment: ['machine'], categories: [] },
    });
    expect(chestMachines.length).toBeGreaterThan(0);
    expect(chestMachines.every((e) => e.equipment === 'machine')).toBe(true);
    expect(
      chestMachines[0]?.muscles.some((m) => m.muscle === 'mid_lower_chest' && m.role === 'primary'),
    ).toBe(true);

    const calisthenicsPulls = searchExercises(index, 'pull', {
      filters: { muscles: [], equipment: [], categories: ['calisthenics'] },
    });
    expect(calisthenicsPulls.every((e) => e.category === 'calisthenics')).toBe(true);
    expect(calisthenicsPulls.map((e) => e.slug)).toContain('pull-up');
  });

  it('ranks exercises you use often a little higher', () => {
    const usage = new Map([['dumbbell-bench-press', 20]]);
    const withUsage = searchExercises(index, 'bench', { usage, limit: 3 }).map((e) => e.slug);
    expect(withUsage.indexOf('dumbbell-bench-press')).toBeLessThanOrEqual(1);
  });

  it('normalises text and measures edit distance', () => {
    expect(normaliseText("Farmer's carry")).toBe('farmers carry');
    expect(normaliseText('Pull-up')).toBe('pull up');
    expect(editDistance('squart', 'squat', 2)).toBe(1);
    expect(editDistance('bnech', 'bench', 2)).toBe(1);
    expect(editDistance('abc', 'xyz', 1)).toBe(2);
  });
});

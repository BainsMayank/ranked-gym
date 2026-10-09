import { exercises as seed } from '../../../../supabase/seed/exercises.ts';
import { exercise, set, testId } from '../__fixtures__/routine';
import { isTimedLogType } from '../defaults';
import { muscleSets, summariseRoutine } from '../summary';
import { instantiateTemplate, routineTemplates } from '../templates';
import { validateRoutineDoc } from '../validate';

// The official library as the app sees it locally (stable fake ids keyed by slug).
const library = seed.map((e) => ({
  id: testId(),
  slug: e.slug,
  logType: e.logType,
  mechanic: e.mechanic,
  muscles: e.muscles,
}));
const bySlug = new Map(library.map((e) => [e.slug, e]));

describe('starter templates', () => {
  it('has 8 to 10 templates with unique slugs', () => {
    expect(routineTemplates.length).toBeGreaterThanOrEqual(8);
    expect(routineTemplates.length).toBeLessThanOrEqual(10);
    expect(new Set(routineTemplates.map((t) => t.slug)).size).toBe(routineTemplates.length);
  });

  it.each(routineTemplates.map((t) => [t.slug, t] as const))(
    '%s uses real exercises with targets that suit them',
    (_slug, template) => {
      for (const te of template.exercises) {
        const info = bySlug.get(te.slug);
        expect(info).toBeDefined();
        const timed = isTimedLogType(info!.logType);
        for (const s of te.sets) {
          if (timed) expect(s.sec).toBeDefined();
          else expect(s.reps).toBeDefined();
        }
      }
    },
  );

  it.each(routineTemplates.map((t) => [t.slug, t] as const))(
    '%s becomes a valid routine of your own',
    (_slug, template) => {
      const doc = instantiateTemplate(template, library, testId, '2026-10-07T00:00:00Z');
      expect(doc).not.toBeNull();
      expect(validateRoutineDoc(doc!)).toEqual({ ok: true });
      expect(doc!.source).toBe('copied');
      expect(doc!.sourceRef).toBe(`template:${template.slug}`);
      expect(doc!.estimatedDurationMin).toBeGreaterThan(0);
    },
  );

  it('keeps the 20-minute home routine near 20 minutes', () => {
    const t = routineTemplates.find((x) => x.slug === 'dumbbell-home-20')!;
    const doc = instantiateTemplate(t, library, testId, '2026-10-07T00:00:00Z')!;
    expect(doc.estimatedDurationMin).toBeLessThanOrEqual(25);
  });

  it('returns null while the library is missing an exercise', () => {
    expect(instantiateTemplate(routineTemplates[0]!, [], testId, 'now')).toBeNull();
  });
});

describe('routine summary', () => {
  const lookup = (id: string) => library.find((e) => e.id === id);
  const squat = bySlug.get('barbell-back-squat')!;

  it('weights muscles by role and ignores warm-ups', () => {
    const e = exercise({
      exerciseId: squat.id,
      sets: [set({ setType: 'warmup' }), set(), set(), set({ setType: 'drop' })],
    });
    const summary = summariseRoutine([e], lookup);
    expect(summary.totalSets).toBe(4);
    expect(summary.workingSets).toBe(3);
    const quads = summary.muscles.find((m) => m.muscle === 'quads');
    expect(quads?.sets).toBe(3);
    const secondary = squat.muscles.find((m) => m.role === 'secondary');
    if (secondary) {
      expect(summary.muscles.find((m) => m.muscle === secondary.muscle)?.sets).toBe(
        3 * secondary.weight,
      );
    }
    expect(
      summary.muscles.some(
        (m) => squat.muscles.find((x) => x.muscle === m.muscle)?.role === 'stabiliser',
      ),
    ).toBe(false);
  });

  it('sorts muscles by weighted sets', () => {
    const list = muscleSets([{ exerciseId: squat.id, workingSets: 2 }], lookup);
    expect(list[0]!.sets).toBeGreaterThanOrEqual(list[list.length - 1]!.sets);
  });
});

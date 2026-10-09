import type { Muscle } from '@/lib/exercises/taxonomy';
import type { MovementPattern } from '@/lib/workouts/generator/patterns';

import type { LadderKey, OptionKey } from './catalog';
import type { PlanGoal, PlanLevel, SlotRole, TemplateFamily } from './types';

/**
 * Session templates and splits. Each template owns a set of muscles: every exercise it holds must
 * have all its primary muscles inside that set. Templates on back-to-back days must own disjoint
 * sets, which is what keeps the same primary muscles off consecutive days.
 */

export interface Slot {
  key: string;
  role: SlotRole;
  /** Curated choices (catalog OPTIONS), or a calisthenics ladder picked by level. */
  options?: OptionKey;
  ladder?: LadderKey;
  /** When no curated choice fits: search the library for this pattern or primary muscle. */
  pattern?: MovementPattern;
  muscle?: Muscle;
  /** An accessory that goes in with the main lifts (core work, so every week covers it). */
  required?: boolean;
}

export interface SessionTemplate {
  key: string;
  label: string;
  family: TemplateFamily;
  slots: Slot[];
}

const UPPER: Muscle[] = [
  'upper_chest',
  'mid_lower_chest',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'lats',
  'upper_back',
  'traps',
];
const LOWER: Muscle[] = [
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'abductors',
  'calves',
  'lower_back',
  'abs',
  'obliques',
];

export const FAMILY_MUSCLES: Record<TemplateFamily, ReadonlySet<Muscle>> = {
  full: new Set([...UPPER, ...LOWER]),
  upper: new Set(UPPER),
  lower: new Set(LOWER),
  legs: new Set(LOWER),
  push: new Set(['upper_chest', 'mid_lower_chest', 'front_delts', 'side_delts', 'triceps']),
  pull: new Set(['lats', 'upper_back', 'rear_delts', 'biceps', 'forearms', 'traps']),
};

export function familiesOverlap(a: TemplateFamily, b: TemplateFamily): boolean {
  for (const m of FAMILY_MUSCLES[a]) if (FAMILY_MUSCLES[b].has(m)) return true;
  return false;
}

const s = (
  key: string,
  role: SlotRole,
  source: { options?: OptionKey; ladder?: LadderKey },
  fallback: { pattern?: MovementPattern; muscle?: Muscle } = {},
): Slot => ({ key, role, ...source, ...fallback });

const strengthy = (goal: PlanGoal) => goal === 'stronger' || goal === 'gain';

/** Every template a goal can use, by key. */
export function templatesFor(goal: PlanGoal): Record<string, SessionTemplate> {
  const hinge = strengthy(goal) ? 'deadlift' : 'rdl';
  const strong = goal === 'stronger';
  const t = (key: string, label: string, family: TemplateFamily, slots: Slot[]) => ({
    key,
    label,
    family,
    slots,
  });
  const squat = (role: SlotRole, options: OptionKey = 'squat') =>
    s('squat', role, { options }, { pattern: 'squat' });
  const lateral = s('lateral', 'accessory', { options: 'lateral' }, { muscle: 'side_delts' });
  const rear = s('rear', 'accessory', { options: 'rear' }, { muscle: 'rear_delts' });
  const biceps = (o: OptionKey = 'biceps') =>
    s('biceps', 'accessory', { options: o }, { muscle: 'biceps' });
  const triceps = (o: OptionKey = 'triceps') =>
    s('triceps', 'accessory', { options: o }, { muscle: 'triceps' });
  const calves = s('calves', 'accessory', { options: 'calves' }, { muscle: 'calves' });
  const core = (o: OptionKey = 'core'): Slot => ({
    ...s('core', 'accessory', { options: o }, { muscle: 'abs' }),
    required: true,
  });
  const abduction = s('abduction', 'accessory', { options: 'abduction' }, { muscle: 'abductors' });

  if (goal === 'calisthenics') {
    // Strength ladders fall back to the library (dumbbell rows when there's no bar); skills don't.
    const fallback: Partial<Record<LadderKey, { pattern?: MovementPattern; muscle?: Muscle }>> = {
      push: { pattern: 'h_push', muscle: 'mid_lower_chest' },
      dip: { pattern: 'h_push', muscle: 'triceps' },
      pull: { pattern: 'v_pull', muscle: 'lats' },
      chin: { pattern: 'v_pull', muscle: 'lats' },
      row: { pattern: 'h_pull', muscle: 'upper_back' },
      squat: { pattern: 'squat', muscle: 'quads' },
      lunge: { pattern: 'lunge', muscle: 'quads' },
      hinge: { pattern: 'hinge', muscle: 'hamstrings' },
      pike: { pattern: 'v_push', muscle: 'front_delts' },
      core: { muscle: 'abs' },
    };
    const l = (key: string, role: SlotRole, ladder: LadderKey): Slot => ({
      ...s(key, role, { ladder }, fallback[ladder]),
      required: ladder === 'core' || undefined,
    });
    return Object.fromEntries(
      [
        t('CFB_A', 'Full body A', 'full', [
          l('handstand', 'skill', 'handstand'),
          l('lsit', 'skill', 'lsit'),
          l('push', 'main', 'push'),
          l('pull', 'main', 'pull'),
          l('squat', 'secondary', 'squat'),
          l('row', 'secondary', 'row'),
          l('core', 'accessory', 'core'),
        ]),
        t('CFB_B', 'Full body B', 'full', [
          l('planche', 'skill', 'planche'),
          l('dip', 'main', 'dip'),
          l('chin', 'main', 'chin'),
          l('lunge', 'secondary', 'lunge'),
          l('hinge', 'secondary', 'hinge'),
          l('pike', 'accessory', 'pike'),
          l('core', 'accessory', 'core'),
        ]),
        t('CFB_C', 'Full body C', 'full', [
          l('frontLever', 'skill', 'frontLever'),
          l('push', 'main', 'push'),
          l('pull', 'main', 'pull'),
          l('squat', 'secondary', 'squat'),
          l('pike', 'secondary', 'pike'),
          l('core', 'accessory', 'core'),
        ]),
        t('CU_A', 'Upper A', 'upper', [
          l('handstand', 'skill', 'handstand'),
          l('frontLever', 'skill', 'frontLever'),
          l('push', 'main', 'push'),
          l('pull', 'main', 'pull'),
          l('dip', 'secondary', 'dip'),
          l('row', 'secondary', 'row'),
          l('pike', 'accessory', 'pike'),
        ]),
        t('CU_B', 'Upper B', 'upper', [
          l('planche', 'skill', 'planche'),
          l('frontLever', 'skill', 'frontLever'),
          l('dip', 'main', 'dip'),
          l('chin', 'main', 'chin'),
          l('pike', 'secondary', 'pike'),
          l('row', 'secondary', 'row'),
          s('triceps', 'accessory', { options: 'tricepsBodyweight' }, { muscle: 'triceps' }),
        ]),
        t('CL_A', 'Legs A', 'lower', [
          l('lsit', 'skill', 'lsit'),
          l('squat', 'main', 'squat'),
          l('hinge', 'secondary', 'hinge'),
          l('lunge', 'secondary', 'lunge'),
          calves,
          l('core', 'accessory', 'core'),
        ]),
        t('CL_B', 'Legs B', 'lower', [
          l('lsit', 'skill', 'lsit'),
          l('lunge', 'main', 'lunge'),
          l('squat', 'secondary', 'squat'),
          l('hinge', 'secondary', 'hinge'),
          calves,
          core('coreAlt'),
        ]),
        t('CPUSH_A', 'Push A', 'push', [
          l('handstand', 'skill', 'handstand'),
          l('planche', 'skill', 'planche'),
          l('push', 'main', 'push'),
          l('dip', 'secondary', 'dip'),
          l('pike', 'secondary', 'pike'),
          s('triceps', 'accessory', { options: 'tricepsBodyweight' }, { muscle: 'triceps' }),
        ]),
        t('CPUSH_B', 'Push B', 'push', [
          l('planche', 'skill', 'planche'),
          l('dip', 'main', 'dip'),
          l('push', 'secondary', 'push'),
          l('pike', 'secondary', 'pike'),
          lateral,
        ]),
        t('CPULL_A', 'Pull A', 'pull', [
          l('frontLever', 'skill', 'frontLever'),
          l('pull', 'main', 'pull'),
          l('row', 'secondary', 'row'),
          biceps(),
          rear,
        ]),
        t('CPULL_B', 'Pull B', 'pull', [
          l('frontLever', 'skill', 'frontLever'),
          l('chin', 'main', 'chin'),
          l('row', 'secondary', 'row'),
          biceps('bicepsAlt'),
          rear,
        ]),
      ].map((x) => [x.key, x]),
    );
  }

  const upperA = t('UPPER_A', 'Upper A', 'upper', [
    s('hpush', 'main', { options: 'bench' }, { pattern: 'h_push' }),
    s('hpull', 'main', { options: 'row' }, { pattern: 'h_pull', muscle: 'upper_back' }),
    s('vpush', 'secondary', { options: 'shoulderPress' }, { pattern: 'v_push' }),
    s('vpull', 'secondary', { options: 'pulldownAlt' }, { pattern: 'v_pull', muscle: 'lats' }),
    lateral,
    biceps(),
    triceps(),
    s('fly', 'accessory', { options: 'chestFly' }, { muscle: 'mid_lower_chest' }),
  ]);
  const upperB = t('UPPER_B', 'Upper B', 'upper', [
    strong
      ? s('vpush', 'main', { options: 'ohp' }, { pattern: 'v_push' })
      : s('hpush', 'main', { options: 'incline' }, { pattern: 'h_push' }),
    s('vpull', 'main', { options: 'pulldown' }, { pattern: 'v_pull', muscle: 'lats' }),
    strong
      ? s('hpush', 'secondary', { options: 'incline' }, { pattern: 'h_push' })
      : s('hpush2', 'secondary', { options: 'press' }, { pattern: 'h_push' }),
    s('hpull', 'secondary', { options: 'rowAlt' }, { pattern: 'h_pull', muscle: 'upper_back' }),
    rear,
    triceps('tricepsAlt'),
    biceps('bicepsAlt'),
    lateral,
  ]);

  const shared = [
    t('FB_A', 'Full body A', 'full', [
      squat('main'),
      s('hpush', 'main', { options: 'bench' }, { pattern: 'h_push' }),
      s('vpull', 'secondary', { options: 'pulldown' }, { pattern: 'v_pull', muscle: 'lats' }),
      s('hinge', 'secondary', { options: 'rdl' }, { pattern: 'hinge' }),
      lateral,
      triceps(),
      core(),
    ]),
    t('FB_B', 'Full body B', 'full', [
      // Full body A already has a Romanian deadlift; B is the deadlift day for every goal.
      s('hinge', 'main', { options: 'deadlift' }, { pattern: 'hinge' }),
      s('vpush', 'main', { options: 'ohp' }, { pattern: 'v_push' }),
      s('hpull', 'secondary', { options: 'row' }, { pattern: 'h_pull', muscle: 'upper_back' }),
      s('lunge', 'secondary', { options: 'lunge' }, { pattern: 'lunge' }),
      rear,
      biceps(),
      calves,
    ]),
    t('FB_C', 'Full body C', 'full', [
      squat('main', strong ? 'squat' : 'squatAlt'),
      s('hpush', 'main', { options: strong ? 'bench' : 'incline' }, { pattern: 'h_push' }),
      s('hpull', 'secondary', { options: 'rowAlt' }, { pattern: 'h_pull', muscle: 'upper_back' }),
      s('glute', 'secondary', { options: 'hipThrust' }, { pattern: 'hinge' }),
      lateral,
      biceps('bicepsAlt'),
      core('coreAlt'),
    ]),
    upperA,
    upperB,
    t('LOWER_A', 'Lower A', 'lower', [
      squat('main'),
      s(
        'hinge',
        'secondary',
        { options: strengthy(goal) ? 'rdl' : 'hipThrust' },
        { pattern: 'hinge' },
      ),
      s('lunge', 'secondary', { options: 'lunge' }, { pattern: 'lunge' }),
      s('legcurl', 'accessory', { options: 'legCurl' }, { muscle: 'hamstrings' }),
      calves,
      core(),
      s('legext', 'accessory', { options: 'legExtension' }, { muscle: 'quads' }),
    ]),
    t('LOWER_B', 'Lower B', 'lower', [
      s('hinge', 'main', { options: hinge }, { pattern: 'hinge' }),
      squat('secondary', 'squatAlt'),
      s('lunge', 'secondary', { options: 'lungeAlt' }, { pattern: 'lunge' }),
      s('legext', 'accessory', { options: 'legExtension' }, { muscle: 'quads' }),
      calves,
      core('coreAlt'),
      s('legcurl', 'accessory', { options: 'legCurl' }, { muscle: 'hamstrings' }),
    ]),
    t('PUSH_A', 'Push A', 'push', [
      s('hpush', 'main', { options: 'bench' }, { pattern: 'h_push' }),
      s('vpush', 'secondary', { options: 'shoulderPress' }, { pattern: 'v_push' }),
      s('hpush2', 'secondary', { options: 'incline' }, { pattern: 'h_push' }),
      lateral,
      triceps(),
      s('fly', 'accessory', { options: 'chestFly' }, { muscle: 'mid_lower_chest' }),
    ]),
    t('PUSH_B', 'Push B', 'push', [
      s('vpush', 'main', { options: 'ohp' }, { pattern: 'v_push' }),
      s('hpush', 'secondary', { options: 'press' }, { pattern: 'h_push' }),
      s('hpush2', 'secondary', { options: 'incline' }, { pattern: 'h_push' }),
      lateral,
      s('fly', 'accessory', { options: 'chestFly' }, { muscle: 'mid_lower_chest' }),
      triceps('tricepsAlt'),
    ]),
    t('PULL_A', 'Pull A', 'pull', [
      s('vpull', 'main', { options: 'pulldown' }, { pattern: 'v_pull', muscle: 'lats' }),
      s('hpull', 'main', { options: 'row' }, { pattern: 'h_pull', muscle: 'upper_back' }),
      rear,
      biceps(),
      biceps('bicepsAlt'),
    ]),
    t('PULL_B', 'Pull B', 'pull', [
      s('hpull', 'main', { options: 'rowAlt' }, { pattern: 'h_pull', muscle: 'upper_back' }),
      s('vpull', 'secondary', { options: 'pulldownAlt' }, { pattern: 'v_pull', muscle: 'lats' }),
      rear,
      biceps('bicepsAlt'),
      biceps(),
    ]),
    t('LEGS_A', 'Legs A', 'legs', [
      squat('main'),
      s('hinge', 'secondary', { options: 'rdl' }, { pattern: 'hinge' }),
      s('lunge', 'secondary', { options: 'lunge' }, { pattern: 'lunge' }),
      s('legcurl', 'accessory', { options: 'legCurl' }, { muscle: 'hamstrings' }),
      s('legext', 'accessory', { options: 'legExtension' }, { muscle: 'quads' }),
      calves,
      core(),
    ]),
    t('LEGS_B', 'Legs B', 'legs', [
      s(
        'hinge',
        'main',
        { options: strengthy(goal) ? 'deadlift' : 'hipThrust' },
        { pattern: 'hinge' },
      ),
      squat('secondary', 'squatAlt'),
      s('lunge', 'secondary', { options: 'lungeAlt' }, { pattern: 'lunge' }),
      s('legcurl', 'accessory', { options: 'legCurl' }, { muscle: 'hamstrings' }),
      calves,
      core('coreAlt'),
    ]),
    // Glute focus ("curvier").
    t('GL_A', 'Glutes and hamstrings', 'lower', [
      s('glute', 'main', { options: 'hipThrust' }, { pattern: 'hinge' }),
      squat('secondary'),
      s('hinge', 'secondary', { options: 'rdl' }, { pattern: 'hinge' }),
      abduction,
      s('legcurl', 'accessory', { options: 'legCurl' }, { muscle: 'hamstrings' }),
      s('kickback', 'accessory', { options: 'kickback' }, { muscle: 'glutes' }),
      core(),
    ]),
    t('GL_B', 'Glutes and quads', 'lower', [
      s('hinge', 'main', { options: 'rdl' }, { pattern: 'hinge' }),
      s('lunge', 'secondary', { options: 'lunge' }, { pattern: 'lunge' }),
      s('glute', 'secondary', { options: 'hipThrust' }, { pattern: 'hinge' }),
      abduction,
      s('legext', 'accessory', { options: 'legExtension' }, { muscle: 'quads' }),
      calves,
    ]),
    t('GL_C', 'Glutes and legs', 'lower', [
      squat('main', 'squatAlt'),
      s('glute', 'secondary', { options: 'hipThrust' }, { pattern: 'hinge' }),
      s('lunge', 'secondary', { options: 'lungeAlt' }, { pattern: 'lunge' }),
      abduction,
      s('kickback', 'accessory', { options: 'kickback' }, { muscle: 'glutes' }),
      core('coreAlt'),
    ]),
    t('FBG_A', 'Full body (glutes) A', 'full', [
      s('glute', 'main', { options: 'hipThrust' }, { pattern: 'hinge' }),
      squat('secondary'),
      s('vpull', 'secondary', { options: 'pulldownAlt' }, { pattern: 'v_pull', muscle: 'lats' }),
      s('hpush', 'secondary', { options: 'press' }, { pattern: 'h_push' }),
      abduction,
      lateral,
    ]),
    t('FBG_B', 'Full body (glutes) B', 'full', [
      s('hinge', 'main', { options: 'rdl' }, { pattern: 'hinge' }),
      s('lunge', 'secondary', { options: 'lunge' }, { pattern: 'lunge' }),
      s('hpull', 'secondary', { options: 'rowAlt' }, { pattern: 'h_pull', muscle: 'upper_back' }),
      s('vpush', 'secondary', { options: 'shoulderPress' }, { pattern: 'v_push' }),
      abduction,
      core(),
    ]),
  ];
  return Object.fromEntries(shared.map((x) => [x.key, x]));
}

export interface SplitChoice {
  label: string;
  keys: string[];
  /** Plain-text reason, for "Why this plan". */
  why: string;
  /** Last resort only: colour the days upper/lower and take keys from these in turn. */
  alternate?: { upper: string[]; lower: string[] };
}

/**
 * Splits to try, in order, for a goal, level and number of days. The scheduler takes the first
 * one it can place without back-to-back overlap; the last resort (alternating upper and lower)
 * always fits.
 */
export function splitOptions(
  goal: PlanGoal,
  level: PlanLevel,
  days: number,
  minutes = 60,
): SplitChoice[] {
  const ul = (keys: string[], why: string): SplitChoice => ({ label: 'Upper / lower', keys, why });
  const ppl = (keys: string[], why: string, label = 'Push / pull / legs'): SplitChoice => ({
    label,
    keys,
    why,
  });

  if (goal === 'calisthenics') {
    const byDays: Record<number, SplitChoice[]> = {
      2: [
        {
          label: 'Full body',
          keys: ['CFB_A', 'CFB_B'],
          why: 'Two full-body sessions practise every skill twice a week.',
        },
      ],
      3: [
        {
          label: 'Full body',
          keys: ['CFB_A', 'CFB_B', 'CFB_C'],
          why: 'Skills improve with frequent practice, so every session trains the whole body.',
        },
        ppl(
          ['CPUSH_A', 'CPULL_A', 'CL_A'],
          'Push, pull and legs keep back-to-back days on different muscles.',
        ),
      ],
      4: [
        ul(
          ['CU_A', 'CL_A', 'CU_B', 'CL_B'],
          'Upper and lower days alternate, so each half rests while the other trains.',
        ),
      ],
      5: [
        ppl(
          ['CU_A', 'CL_A', 'CPUSH_B', 'CPULL_B', 'CL_B'],
          'Upper/lower early in the week, push/pull/legs after it.',
          'Upper / lower + push / pull / legs',
        ),
      ],
      6: [
        ppl(
          ['CPUSH_A', 'CPULL_A', 'CL_A', 'CPUSH_B', 'CPULL_B', 'CL_B'],
          'Push, pull, legs twice: every muscle twice a week with a day off between.',
          'Push / pull / legs ×2',
        ),
      ],
    };
    return [...(byDays[days] ?? []), alternate(['CU_A', 'CU_B'], ['CL_A', 'CL_B'])];
  }

  if (goal === 'curvier') {
    const lower = 'Lower (glutes) / upper';
    const byDays: Record<number, SplitChoice[]> = {
      2: [
        {
          label: 'Full body, glute focus',
          keys: ['FBG_A', 'FBG_B'],
          why: 'With two days, both sessions start with glute work and still train the upper body.',
        },
      ],
      3: [
        {
          label: lower,
          keys: ['GL_A', 'UPPER_A', 'GL_B'],
          why: 'Two glute-focused lower sessions and one upper session a week.',
        },
      ],
      4: [
        {
          label: lower,
          keys: ['GL_A', 'UPPER_A', 'GL_B', 'UPPER_B'],
          why: 'Two glute-focused lower sessions, two upper sessions.',
        },
      ],
      5: [
        {
          label: lower,
          keys: ['GL_A', 'UPPER_A', 'GL_B', 'UPPER_B', 'GL_C'],
          why: 'Three glute-focused lower sessions, two upper sessions.',
        },
      ],
      6: [
        {
          label: lower,
          keys: ['GL_A', 'UPPER_A', 'GL_B', 'UPPER_B', 'GL_C', 'UPPER_A'],
          why: 'Three glute-focused lower sessions alternating with upper sessions.',
        },
      ],
    };
    return [...(byDays[days] ?? []), alternate(['UPPER_A', 'UPPER_B'], ['GL_A', 'GL_B', 'GL_C'])];
  }

  // Three days of push/pull/legs trains each muscle once a week: only advanced lifters chasing
  // size with long sessions (75+ min) get it first; everyone else trains full body three times.
  const fullBodyFirst = !(
    level === 'advanced' &&
    (goal === 'muscle' || goal === 'gain') &&
    minutes >= 75
  );
  const byDays: Record<number, SplitChoice[]> = {
    2: [
      {
        label: 'Full body A / B',
        keys: ['FB_A', 'FB_B'],
        why: 'Two full-body sessions train every muscle twice a week.',
      },
    ],
    3: fullBodyFirst
      ? [
          {
            label: 'Full body',
            keys: ['FB_A', 'FB_B', 'FB_C'],
            why:
              goal === 'stronger'
                ? 'Full body three times a week practises the main lifts often, which is how strength grows.'
                : 'Full body three times a week trains every muscle often with plenty of rest between.',
          },
          ppl(
            ['PUSH_A', 'PULL_A', 'LEGS_A'],
            'Push, pull and legs keep back-to-back days on different muscles.',
          ),
        ]
      : [
          ppl(
            ['PUSH_A', 'PULL_A', 'LEGS_A'],
            'Push, pull and legs give each muscle a full, high-volume session.',
          ),
          {
            label: 'Full body',
            keys: ['FB_A', 'FB_B', 'FB_C'],
            why: 'Full body three times a week.',
          },
        ],
    4: [
      ul(
        ['UPPER_A', 'LOWER_A', 'UPPER_B', 'LOWER_B'],
        'Upper and lower twice each: every muscle twice a week.',
      ),
    ],
    5: [
      ppl(
        ['UPPER_A', 'LOWER_A', 'PUSH_B', 'PULL_B', 'LEGS_B'],
        'Upper/lower plus push/pull/legs: every muscle about twice a week.',
        'Upper / lower + push / pull / legs',
      ),
    ],
    6: [
      ppl(
        ['PUSH_A', 'PULL_A', 'LEGS_A', 'PUSH_B', 'PULL_B', 'LEGS_B'],
        'Push, pull, legs twice: every muscle twice a week.',
        'Push / pull / legs ×2',
      ),
    ],
  };
  return [...(byDays[days] ?? []), alternate(['UPPER_A', 'UPPER_B'], ['LOWER_A', 'LOWER_B'])];
}

/** Last resort: upper and lower sessions alternating (the scheduler colours the days). */
function alternate(upper: string[], lower: string[]): SplitChoice {
  return {
    label: 'Upper / lower',
    keys: [],
    alternate: { upper, lower },
    why: 'Your days are back to back, so upper and lower sessions alternate and no muscle trains two days running.',
  };
}

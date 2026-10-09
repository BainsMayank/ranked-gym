/**
 * Curated exercise choices by slug, in order of preference. A slot takes the first one that the
 * lifter's equipment, bars and avoid list allow (and that its session may train); if none is left,
 * the engine searches the whole library for the slot's pattern or muscle instead.
 */

export const OPTIONS = {
  squat: [
    'barbell-back-squat',
    'barbell-front-squat',
    'goblet-squat',
    'leg-press',
    'hack-squat',
    'smith-machine-squat',
    'belt-squat',
    'dumbbell-bulgarian-split-squat',
    'bodyweight-squat',
  ],
  squatAlt: [
    'leg-press',
    'hack-squat',
    'barbell-front-squat',
    'goblet-squat',
    'pendulum-squat',
    'smith-machine-squat',
    'belt-squat',
    'barbell-back-squat',
    'bodyweight-squat',
  ],
  deadlift: [
    'barbell-deadlift',
    'trap-bar-deadlift',
    'barbell-romanian-deadlift',
    'dumbbell-romanian-deadlift',
    'kettlebell-swing',
    'single-leg-romanian-deadlift',
    'glute-bridge',
  ],
  rdl: [
    'barbell-romanian-deadlift',
    'dumbbell-romanian-deadlift',
    'stiff-leg-deadlift',
    'cable-pull-through',
    'single-leg-romanian-deadlift',
    'kettlebell-swing',
    'glute-bridge',
  ],
  hipThrust: [
    'barbell-hip-thrust',
    'machine-hip-thrust',
    'smith-machine-hip-thrust',
    'glute-bridge',
  ],
  lunge: [
    'dumbbell-bulgarian-split-squat',
    'dumbbell-walking-lunge',
    'dumbbell-reverse-lunge',
    'barbell-reverse-lunge',
    'smith-machine-split-squat',
    'dumbbell-step-up',
    'bodyweight-lunge',
  ],
  lungeAlt: [
    'dumbbell-walking-lunge',
    'dumbbell-reverse-lunge',
    'dumbbell-step-up',
    'barbell-reverse-lunge',
    'dumbbell-bulgarian-split-squat',
    'bodyweight-lunge',
    'cossack-squat',
  ],
  bench: [
    'barbell-bench-press',
    'dumbbell-bench-press',
    'machine-chest-press',
    'smith-machine-bench-press',
    'push-up',
  ],
  incline: [
    'incline-dumbbell-press',
    'barbell-incline-bench-press',
    'incline-machine-chest-press',
    'smith-machine-incline-press',
    'decline-push-up',
  ],
  press: [
    'dumbbell-bench-press',
    'machine-chest-press',
    'cable-chest-press',
    'barbell-bench-press',
    'push-up',
  ],
  ohp: [
    'barbell-overhead-press',
    'dumbbell-shoulder-press',
    'machine-shoulder-press',
    'kettlebell-overhead-press',
    'landmine-press',
    'pike-push-up',
  ],
  shoulderPress: [
    'dumbbell-shoulder-press',
    'machine-shoulder-press',
    'arnold-press',
    'barbell-overhead-press',
    'kettlebell-overhead-press',
    'pike-push-up',
  ],
  row: [
    'barbell-bent-over-row',
    'one-arm-dumbbell-row',
    't-bar-row',
    'seated-cable-row',
    'chest-supported-machine-row',
    'inverted-row',
  ],
  rowAlt: [
    'chest-supported-dumbbell-row',
    'seated-cable-row',
    'one-arm-dumbbell-row',
    'chest-supported-machine-row',
    't-bar-row',
    'inverted-row',
  ],
  pulldown: [
    'pull-up',
    'lat-pulldown',
    'chin-up',
    'assisted-pull-up-machine',
    'neutral-grip-pull-up',
    'dumbbell-pullover',
  ],
  pulldownAlt: [
    'lat-pulldown',
    'neutral-grip-pull-up',
    'chin-up',
    'close-grip-lat-pulldown',
    'pull-up',
    'assisted-pull-up-machine',
    'dumbbell-pullover',
  ],
  lateral: ['dumbbell-lateral-raise', 'cable-lateral-raise', 'machine-lateral-raise'],
  rear: [
    'cable-face-pull',
    'reverse-pec-deck',
    'dumbbell-rear-delt-fly',
    'cable-rear-delt-fly',
    'band-pull-apart',
  ],
  biceps: [
    'dumbbell-curl',
    'ez-bar-curl',
    'cable-curl',
    'barbell-curl',
    'incline-dumbbell-curl',
    'resistance-band-curl',
  ],
  bicepsAlt: [
    'hammer-curl',
    'incline-dumbbell-curl',
    'bayesian-cable-curl',
    'machine-preacher-curl',
    'cable-rope-hammer-curl',
    'resistance-band-curl',
  ],
  triceps: [
    'cable-rope-pushdown',
    'dumbbell-overhead-triceps-extension',
    'cable-triceps-pushdown',
    'ez-bar-skull-crusher',
    'dumbbell-triceps-kickback',
    'bench-dip',
  ],
  tricepsAlt: [
    'overhead-cable-triceps-extension',
    'ez-bar-skull-crusher',
    'dumbbell-overhead-triceps-extension',
    'dumbbell-triceps-kickback',
    'diamond-push-up',
    'bench-dip',
  ],
  chestFly: ['cable-crossover', 'machine-fly', 'dumbbell-fly', 'low-to-high-cable-fly'],
  legExtension: ['leg-extension'],
  legCurl: ['seated-leg-curl', 'lying-leg-curl', 'nordic-hamstring-curl'],
  abduction: ['hip-abduction-machine', 'cable-hip-abduction', 'band-lateral-walk'],
  kickback: ['cable-glute-kickback', 'glute-bridge'],
  calves: [
    'standing-calf-raise',
    'seated-calf-raise',
    'leg-press-calf-raise',
    'smith-machine-calf-raise',
    'single-leg-dumbbell-calf-raise',
    'bodyweight-calf-raise',
  ],
  core: ['cable-crunch', 'hanging-leg-raise', 'reverse-crunch', 'dead-bug', 'plank'],
  coreAlt: ['plank', 'pallof-press', 'hanging-knee-raise', 'side-plank', 'dead-bug'],
  tricepsBodyweight: ['diamond-push-up', 'bench-dip'],
} as const;

/** Calisthenics progressions: [beginner, intermediate, advanced]. Lower rungs stand in when a rung isn't possible (no bars). */
export const LADDERS = {
  handstand: ['wall-handstand', 'freestanding-handstand', 'handstand-push-up'],
  lsit: ['tuck-l-sit', 'tuck-l-sit', 'l-sit'],
  frontLever: ['tuck-front-lever', 'advanced-tuck-front-lever', 'straddle-front-lever'],
  planche: ['planche-lean', 'tuck-planche', 'advanced-tuck-planche'],
  push: ['push-up', 'decline-push-up', 'archer-push-up'],
  dip: ['bench-dip', 'parallel-bar-dip', 'ring-dip'],
  pull: ['negative-pull-up', 'pull-up', 'archer-pull-up'],
  chin: ['inverted-row', 'chin-up', 'l-sit-pull-up'],
  row: ['inverted-row', 'inverted-row', 'inverted-row'],
  squat: ['bodyweight-squat', 'box-pistol-squat', 'pistol-squat'],
  lunge: ['bodyweight-lunge', 'cossack-squat', 'shrimp-squat'],
  hinge: ['glute-bridge', 'nordic-hamstring-curl', 'nordic-hamstring-curl'],
  pike: ['pike-push-up', 'pike-push-up', 'pseudo-planche-push-up'],
  core: ['hollow-body-hold', 'hanging-knee-raise', 'toes-to-bar'],
} as const;

export type OptionKey = keyof typeof OPTIONS;
export type LadderKey = keyof typeof LADDERS;

/** The next rung after a slug in any ladder (for "ready for the next progression"). */
export function nextRung(slug: string): string | null {
  for (const ladder of Object.values(LADDERS)) {
    const i = ladder.indexOf(slug as never);
    const next = i >= 0 ? ladder.slice(i + 1).find((s) => s !== slug) : undefined;
    if (next) return next;
  }
  return null;
}

/** Need a pull-up bar, dip bars or rings. */
export const NEEDS_BARS = new Set([
  'pull-up',
  'chin-up',
  'neutral-grip-pull-up',
  'wide-grip-pull-up',
  'band-assisted-pull-up',
  'negative-pull-up',
  'scapular-pull-up',
  'archer-pull-up',
  'l-sit-pull-up',
  'muscle-up',
  'ring-muscle-up',
  'dead-hang',
  'inverted-row',
  'hanging-leg-raise',
  'hanging-knee-raise',
  'toes-to-bar',
  'captain-s-chair-leg-raise',
  'parallel-bar-dip',
  'ring-dip',
  'straight-bar-dip',
  'tuck-front-lever',
  'advanced-tuck-front-lever',
  'straddle-front-lever',
  'front-lever',
  'tuck-back-lever',
  'back-lever',
  'human-flag',
]);

/** Bodyweight in the library, but they need gym kit (a GHD or back-extension bench). */
export const NEEDS_GYM = new Set(['back-extension', 'glute-ham-raise']);

/** Harder or more technical: beginners get them only when nothing easier fits. */
export const BEGINNER_LAST = new Set([
  'pull-up',
  'chin-up',
  'neutral-grip-pull-up',
  'barbell-front-squat',
  'pendlay-row',
  'hanging-leg-raise',
  'stiff-leg-deadlift',
]);

/** Finisher cardio: gym machines first, then a brisk walk. */
export const FINISHERS = [
  'stationary-bike',
  'incline-treadmill-walk',
  'elliptical',
  'rowing-machine',
  'jump-rope',
  'walking',
] as const;

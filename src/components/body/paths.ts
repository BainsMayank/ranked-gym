import anatomy from '../../../assets/body/anatomy.json';

import type { Muscle } from '@/lib/exercises/taxonomy';

/** MIT, ELABBASSI Hicham. Original contours; see assets/body/README.md for the mapping. */
export type BodySide = 'front' | 'back';
export type BodyOutline = 'male' | 'female';
export interface MusclePath {
  muscle?: Muscle;
  source: string;
  d: string;
  /** Clips subdivide existing contours; they never add invented anatomy. */
  clip?: string;
}
interface SourcePart {
  slug: string;
  paths: { common?: string[]; left?: string[]; right?: string[] };
}
export const VIEW_BOXES = {
  male: { front: '0 0 724 1448', back: '724 0 724 1448' },
  female: { front: '-50 -40 734 1538', back: '756 0 774 1448' },
} as const;
export const ASPECT_RATIO = {
  male: { front: 1448 / 724, back: 1448 / 724 },
  female: { front: 1538 / 734, back: 1448 / 774 },
} as const;

const DIRECT: Partial<Record<string, Muscle>> = {
  abs: 'abs',
  obliques: 'obliques',
  biceps: 'biceps',
  triceps: 'triceps',
  forearm: 'forearms',
  quadriceps: 'quads',
  hamstring: 'hamstrings',
  calves: 'calves',
  adductors: 'adductors',
  trapezius: 'traps',
  'lower-back': 'lower_back',
  neck: 'neck',
};
const rectangle = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h-${w}Z`;

function adapt(parts: SourcePart[], outline: BodyOutline, side: BodySide): MusclePath[] {
  const result: MusclePath[] = [];
  for (const part of parts) {
    for (const half of ['common', 'left', 'right'] as const) {
      const paths = part.paths[half] ?? [];
      paths.forEach((d, i) => {
        const base = { d, source: `${part.slug}-${half}-${i}` };
        if (part.slug === 'chest') {
          const boundary = outline === 'male' ? 356 : 365;
          result.push({ ...base, muscle: 'upper_chest', clip: rectangle(0, 0, 1600, boundary) });
          result.push({
            ...base,
            muscle: 'mid_lower_chest',
            clip: rectangle(0, boundary, 1600, 1600),
          });
        } else if (part.slug === 'deltoids') {
          const offset = side === 'back' ? (outline === 'male' ? 720 : 820) : 0;
          const split =
            offset +
            (outline === 'male' ? (half === 'left' ? 240 : 488) : half === 'left' ? 212 : 428);
          const inner =
            half === 'left' ? rectangle(split, 0, 1600, 1600) : rectangle(0, 0, split, 1600);
          const outer =
            half === 'left' ? rectangle(0, 0, split, 1600) : rectangle(split, 0, 1600, 1600);
          result.push({
            ...base,
            muscle: side === 'front' ? 'front_delts' : 'rear_delts',
            clip: inner,
          });
          result.push({ ...base, muscle: 'side_delts', clip: outer });
        } else if (part.slug === 'upper-back') {
          const latIndex = outline === 'male' && half === 'right' ? 2 : 1;
          result.push({ ...base, muscle: i === latIndex ? 'lats' : 'upper_back' });
        } else if (part.slug === 'gluteal') {
          const abductorIndex = outline === 'female' && half === 'right' ? 1 : 0;
          result.push({ ...base, muscle: i === abductorIndex ? 'abductors' : 'glutes' });
        } else {
          result.push({ ...base, muscle: DIRECT[part.slug] });
        }
      });
    }
  }
  return result;
}
export const BODY_PATHS: Record<BodyOutline, Record<BodySide, MusclePath[]>> = {
  male: {
    front: adapt(anatomy.maleFront, 'male', 'front'),
    back: adapt(anatomy.maleBack, 'male', 'back'),
  },
  female: {
    front: adapt(anatomy.femaleFront, 'female', 'front'),
    back: adapt(anatomy.femaleBack, 'female', 'back'),
  },
};
/** Kept for callers that inspect the default canonical map. */
export const MUSCLE_PATHS = {
  front: BODY_PATHS.male.front.filter((p) => p.muscle && p.muscle !== 'neck'),
  back: BODY_PATHS.male.back.filter((p) => p.muscle && p.muscle !== 'neck'),
};

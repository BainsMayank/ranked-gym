import { z } from 'zod';

import { heightCmSchema, heightFeetInchesSchema } from '@/lib/profile';
import { cmToFeetInches, type WeightUnit } from '@/lib/units';

import type { HeightValues } from './components/fields/HeightField';

/** Form strings for a stored height. */
export function heightValues(cm: number | null | undefined): HeightValues {
  if (cm === null || cm === undefined) return { heightCm: '', feet: '', inches: '' };
  const { feet, inches } = cmToFeetInches(cm);
  return { heightCm: String(cm), feet: String(feet), inches: String(inches) };
}

/**
 * Validates whichever height fields the unit shows and returns cm, putting any error on the field the
 * user can fix. Call from inside a zod `.transform`.
 */
export function parseHeight(
  unit: WeightUnit,
  v: HeightValues,
  ctx: z.RefinementCtx,
): number | typeof z.NEVER {
  if (unit === 'kg') {
    const r = heightCmSchema.safeParse(v.heightCm);
    if (r.success) return r.data;
    ctx.addIssue({ code: 'custom', message: r.error.issues[0]?.message, path: ['heightCm'] });
    return z.NEVER;
  }
  const r = heightFeetInchesSchema.safeParse({ feet: v.feet, inches: v.inches });
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  ctx.addIssue({
    code: 'custom',
    message: issue?.message,
    path: [issue?.path[0] === 'inches' ? 'inches' : 'feet'],
  });
  return z.NEVER;
}

export const heightFields = {
  heightCm: z.string(),
  feet: z.string(),
  inches: z.string(),
};

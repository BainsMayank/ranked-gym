import { z } from 'zod';

import { feetInchesToCm, toKg, weightUnits, type WeightUnit } from '@/lib/units';

import { experienceOptions, goalOptions, sexOptions, visibilityOptions } from './options';

/**
 * Field rules shared by onboarding and profile editing. They mirror the database constraints in
 * supabase/migrations (the database is still the final check). Messages are shown inline.
 */

export const MIN_AGE = 13;

/**
 * A number typed into a text field: blank means missing (so the "required" message shows, not a
 * range error) and a decimal comma is accepted.
 */
const numberField = (required: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? (v.trim() === '' ? undefined : v.replace(',', '.')) : v),
    z.coerce.number({ error: required }),
  );

const ids = <T extends string>(options: readonly { id: T }[]) =>
  options.map((o) => o.id) as [T, ...T[]];

export const usernameSchema = z
  .string()
  .trim()
  .min(3, { error: 'At least 3 characters.' })
  .max(20, { error: '20 characters at most.' })
  .regex(/^[a-z0-9_]+$/, { error: 'Use lowercase letters, numbers and underscores only.' });

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Tell us what to call you.' })
  .max(40, { error: '40 characters at most.' });

export const bioSchema = z.string().trim().max(160, { error: '160 characters at most.' });

export function birthYearSchema(now: Date = new Date()) {
  const year = now.getFullYear();
  return numberField('Enter the year you were born.').pipe(
    z
      .number()
      .int({ error: 'Enter a 4-digit year.' })
      .min(1900, { error: 'Enter a 4-digit year.' })
      .max(year - MIN_AGE, { error: `You need to be at least ${MIN_AGE} to use Ranked Gym.` }),
  );
}

const heightRangeCm = z
  .number()
  .min(100, { error: 'Height should be between 100 and 250 cm (3′4″ to 8′2″).' })
  .max(250, { error: 'Height should be between 100 and 250 cm (3′4″ to 8′2″).' });

/** Height typed in cm (kg users). */
export const heightCmSchema = numberField('Enter your height.').pipe(heightRangeCm);

/** Height typed as feet and inches (lb users), output in cm. */
export const heightFeetInchesSchema = z
  .object({
    feet: numberField('Enter feet.').pipe(z.number().int({ error: 'Whole feet only.' })),
    inches: numberField('Enter inches.').pipe(
      z.number().min(0, { error: '0 to 11 inches.' }).lt(12, { error: '0 to 11 inches.' }),
    ),
  })
  .transform(feetInchesToCm)
  .pipe(heightRangeCm);

const weightRangeError = 'That weight looks off. Check the number and the unit.';

/** Bodyweight typed in the user's unit, output in kg (the only unit stored). */
export function bodyweightSchema(unit: WeightUnit) {
  return numberField('Enter your bodyweight.')
    .transform((v) => toKg(v, unit))
    .pipe(z.number().min(20, { error: weightRangeError }).max(400, { error: weightRangeError }));
}

export const citySchema = z
  .string()
  .trim()
  .min(1, { error: 'Add your city for city leaderboards.' })
  .max(60, { error: '60 characters at most.' });

/** Optional: an empty string means "no college". */
export const collegeSchema = z.string().trim().max(100, { error: '100 characters at most.' });

export const unitsSchema = z.enum(weightUnits);
export const sexSchema = z.enum(ids(sexOptions));
export const experienceSchema = z.enum(ids(experienceOptions), {
  error: 'Pick the one closest to you.',
});
export const goalSchema = z.enum(ids(goalOptions), { error: 'Pick your main goal.' });
export const visibilitySchema = z.enum(ids(visibilityOptions));

/** Turns an empty optional string into null for the database. */
export const emptyToNull = (value: string): string | null => (value.trim() === '' ? null : value);

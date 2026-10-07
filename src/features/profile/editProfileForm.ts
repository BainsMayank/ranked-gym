import { z } from 'zod';

import {
  bioSchema,
  birthYearSchema,
  citySchema,
  collegeSchema,
  displayNameSchema,
  emptyToNull,
  usernameSchema,
  type Profile,
  type ProfileUpdate,
} from '@/lib/profile';
import type { WeightUnit } from '@/lib/units';

import { heightFields, heightValues, parseHeight } from './heightForm';

/** Text fields of the Edit profile form. Choice fields (standards, experience, goal) live in state. */
export function editProfileSchema(unit: WeightUnit) {
  return z
    .object({
      displayName: displayNameSchema,
      username: usernameSchema,
      bio: bioSchema,
      birthYear: birthYearSchema(),
      ...heightFields,
      city: citySchema,
      college: collegeSchema,
    })
    .transform((v, ctx): ProfileUpdate => ({
      display_name: v.displayName,
      username: v.username,
      bio: emptyToNull(v.bio),
      birth_year: v.birthYear,
      height_cm: parseHeight(unit, v, ctx),
      city: v.city,
      college: emptyToNull(v.college),
    }));
}

export function editProfileValues(p: Profile | undefined) {
  return {
    displayName: p?.display_name ?? '',
    username: p?.username ?? '',
    bio: p?.bio ?? '',
    birthYear: p?.birth_year?.toString() ?? '',
    ...heightValues(p?.height_cm),
    city: p?.city ?? '',
    college: p?.college ?? '',
  };
}

export type EditProfileValues = ReturnType<typeof editProfileValues>;

/** Only the columns that differ from the saved profile. */
export function changedFields(profile: Profile, next: ProfileUpdate): ProfileUpdate {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    if (profile[key as keyof Profile] !== value) out[key] = value;
  }
  return out as ProfileUpdate;
}

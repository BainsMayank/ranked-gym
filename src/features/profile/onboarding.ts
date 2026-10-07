import type { Href } from 'expo-router';

/** Onboarding order. Each step saves on Continue, so a restart resumes with values filled in. */
export const onboardingSteps = [
  'name',
  'units',
  'about',
  'body',
  'experience',
  'goal',
  'region',
  'privacy',
] as const;

export type OnboardingStepId = (typeof onboardingSteps)[number];

export function onboardingHref(step: OnboardingStepId): Href {
  return `/onboarding/${step}` as Href;
}

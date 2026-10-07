import { useRouter } from 'expo-router';

import { onboardingHref, onboardingSteps, type OnboardingStepId } from '../onboarding';

/** Position in onboarding plus navigation to the next step. */
export function useOnboardingStep(step: OnboardingStepId) {
  const router = useRouter();
  const index = onboardingSteps.indexOf(step);
  const nextStep = onboardingSteps[index + 1];

  return {
    number: index + 1,
    total: onboardingSteps.length,
    isFirst: index === 0,
    goNext: () => {
      if (nextStep) router.push(onboardingHref(nextStep));
    },
    goBack: () => router.back(),
  };
}

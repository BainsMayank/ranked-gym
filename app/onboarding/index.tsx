import { Redirect } from 'expo-router';

/** Always starts at step 1; saved answers are filled in, so resuming is a few taps of Continue. */
export default function OnboardingIndex() {
  return <Redirect href="/onboarding/name" />;
}

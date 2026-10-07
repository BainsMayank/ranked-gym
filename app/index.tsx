import { Redirect } from 'expo-router';

import { useAuthGate } from '@/lib/auth/useAuthGate';

/** Entry and fallback route: sends people to Welcome, onboarding or the app. */
export default function Index() {
  const gate = useAuthGate();
  if (gate.screen === 'loading') return null;
  if (gate.screen === 'auth') return <Redirect href="/welcome" />;
  if (gate.screen === 'onboarding') return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}

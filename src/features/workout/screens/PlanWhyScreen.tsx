import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { Screen, Skeleton } from '@/components';
import { generatePlan, useActivePlan } from '@/lib/plans';

import { WhyList } from '../plan/components/WhyList';
import { usePlanEngine } from '../plan/hooks/usePlanEngine';

/** "Why this plan": the engine's reasons, rebuilt from the saved answers (same rules, same text). */
export function PlanWhyScreen() {
  const router = useRouter();
  const { data: plan } = useActivePlan();
  const { ctx, ready } = usePlanEngine();
  const sections = useMemo(
    () =>
      plan && ready
        ? generatePlan(plan.settings.input, ctx, { seed: plan.settings.seed, planId: plan.id })
            .explanation
        : null,
    [plan, ready, ctx],
  );
  return (
    <Screen title="Why this plan" onBack={() => router.back()} edges={['top', 'bottom']} scroll>
      {sections ? <WhyList sections={sections} /> : <Skeleton height={320} />}
    </Screen>
  );
}

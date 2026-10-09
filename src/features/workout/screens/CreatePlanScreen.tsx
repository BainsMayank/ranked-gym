import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { inputFromProfile } from '@/lib/plans';
import { useProfile } from '@/lib/profile';

import { EquipmentStep } from '../plan/components/questions/EquipmentStep';
import { FocusStep } from '../plan/components/questions/FocusStep';
import { GoalStep } from '../plan/components/questions/GoalStep';
import { LengthStep } from '../plan/components/questions/LengthStep';
import { LevelStep } from '../plan/components/questions/LevelStep';
import { ScheduleStep } from '../plan/components/questions/ScheduleStep';
import { WeeksStep } from '../plan/components/questions/WeeksStep';
import { PLAN_STEPS, usePlanDraft, type PlanStep } from '../plan/draft';

const STEPS: Record<PlanStep, (props: { onNext: () => void }) => React.ReactElement> = {
  goal: GoalStep,
  level: LevelStep,
  schedule: ScheduleStep,
  length: LengthStep,
  equipment: EquipmentStep,
  focus: FocusStep,
  weeks: WeeksStep,
};

/** Create plan: seven questions, one per screen, starting on what onboarding knows. */
export function CreatePlanScreen() {
  const router = useRouter();
  const { data: profile, isPending } = useProfile();
  const step = usePlanDraft((s) => s.step);
  const begin = usePlanDraft((s) => s.begin);
  const goTo = usePlanDraft((s) => s.goTo);

  // A fresh questionnaire each time the screen opens, prefilled from the profile once it loads.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || isPending) return;
    started.current = true;
    begin(inputFromProfile(profile ?? null));
  }, [begin, profile, isPending]);

  const key = PLAN_STEPS[step]!;
  const Step = STEPS[key];
  const next = () => (step < PLAN_STEPS.length - 1 ? goTo(step + 1) : router.push('/plan/preview'));
  return <Step onNext={next} />;
}

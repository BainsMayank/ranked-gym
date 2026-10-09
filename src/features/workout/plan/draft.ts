import { create } from 'zustand';

import { defaultPlanInput, type PlanInput } from '@/lib/plans';

/**
 * The plan questionnaire's answers while it's being filled in: one question per screen, in this
 * order. Kept in memory only; the plan is saved when the lifter starts it from the preview.
 */
export const PLAN_STEPS = [
  'goal',
  'level',
  'schedule',
  'length',
  'equipment',
  'focus',
  'weeks',
] as const;
export type PlanStep = (typeof PLAN_STEPS)[number];

interface DraftState {
  input: PlanInput;
  step: number;
  /** Bumped by "Regenerate" on the preview. */
  seed: number;
  begin: (input: PlanInput) => void;
  update: (patch: Partial<PlanInput>) => void;
  goTo: (step: number) => void;
  reroll: () => void;
}

export const usePlanDraft = create<DraftState>()((set) => ({
  input: defaultPlanInput,
  step: 0,
  seed: 0,
  begin: (input) => set({ input, step: 0, seed: 0 }),
  update: (patch) => set((s) => ({ input: { ...s.input, ...patch } })),
  goTo: (step) => set({ step: Math.max(0, Math.min(PLAN_STEPS.length - 1, step)) }),
  reroll: () => set((s) => ({ seed: s.seed + 1 })),
}));

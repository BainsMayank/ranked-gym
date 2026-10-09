import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { savedPlan } from '@/lib/plans/__fixtures__/plan';
import type { PlanDoc } from '@/lib/plans';

import { PlanCard } from '../PlanCard';

/** The My Plan card in each state: no plan, a session today, a rest day, a missed day, paused. */

let mockPlan: PlanDoc | null = null;
const mockStart = jest.fn();
const mockPush = jest.fn();
const mockActions = { resume: jest.fn(), skip: jest.fn(), shiftWeek: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('@/lib/plans', () => ({
  ...jest.requireActual('@/lib/plans/engine'),
  useActivePlan: () => ({ data: mockPlan, isPending: false }),
}));
jest.mock('@/lib/routines', () => ({
  ...jest.requireActual('@/lib/routines/parse'),
  useRoutineDoc: () => ({ data: { exercises: [1, 2, 3, 4, 5], estimatedDurationMin: 55 } }),
}));
jest.mock('../../session/hooks/useStartWorkout', () => ({ useStartWorkout: () => mockStart }));
jest.mock('../../plan/hooks/usePlanActions', () => ({ usePlanActions: () => mockActions }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderCard(plan: PlanDoc | null, today: string) {
  mockPlan = plan;
  jest.setSystemTime(new Date(`${today}T09:00:00`));
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <SafeAreaProvider initialMetrics={METRICS}>
        <PlanCard />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

const { plan } = savedPlan();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

it('invites you to create a plan when there is none', async () => {
  await renderCard(null, '2026-10-05');
  await userEvent.setup().press(screen.getByRole('button', { name: 'Create a plan' }));
  expect(mockPush).toHaveBeenCalledWith('/plan/new');
});

it("starts today's session in the logger", async () => {
  await renderCard(plan, '2026-10-05');
  expect(screen.getByText('Upper A')).toBeTruthy();
  expect(screen.getByText('5 exercises · ~55 min')).toBeTruthy();
  expect(screen.getByText('Week 1 of 6')).toBeTruthy();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Start Upper A' }));
  expect(mockStart).toHaveBeenCalledWith({ kind: 'planDay', planDayId: plan.days[0]!.id });
});

it('shows a rest day with the next session', async () => {
  await renderCard(
    { ...plan, days: plan.days.map((d, i) => (i < 2 ? { ...d, status: 'done' as const } : d)) },
    '2026-10-07',
  );
  expect(screen.getByText('Rest day')).toBeTruthy();
  expect(screen.getByText('Next: Upper B, Thu 8 Oct')).toBeTruthy();
  expect(screen.getByText('2 of 24 sessions done')).toBeTruthy();
});

it('offers to shift the week or skip a missed session', async () => {
  await renderCard(plan, '2026-10-06');
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: /Missed Upper A/ }));
  await user.press(screen.getByRole('button', { name: 'Shift the week' }));
  expect(mockActions.shiftWeek).toHaveBeenCalledWith(plan, plan.days[0]!.id);
});

it('resumes a paused plan', async () => {
  await renderCard({ ...plan, pausedAt: '2026-10-06T08:00:00.000Z' }, '2026-10-08');
  expect(screen.getByText('Plan paused')).toBeTruthy();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Resume' }));
  expect(mockActions.resume).toHaveBeenCalled();
});

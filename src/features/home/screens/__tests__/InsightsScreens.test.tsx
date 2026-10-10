import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSyncStatusStore } from '@/lib/sync/status';
import type { Analytics, Goal } from '@/lib/insights/schema';

import { ForYouScreen } from '../ForYouScreen';
import { MuscleAnalysisScreen } from '../MuscleAnalysisScreen';
import { RecoveryScreen } from '../RecoveryScreen';
import { OverviewScreen } from '../OverviewScreen';
import { GoalsScreen } from '../GoalsScreen';
import { GoalForm } from '../../insights/GoalForm';

const mockPush = jest.fn(),
  mockMutate = jest.fn(),
  mockSpeed = jest.fn(),
  mockRefetch = jest.fn(async () => undefined);
const mockNow = Date.parse('2026-10-09T12:00:00Z');
const mockData: Analytics = {
  asOf: '2026-10-09T12:00:00Z',
  start: '2026-09-26T00:00:00Z',
  end: '2026-10-10T00:00:00Z',
  zone: 'UTC',
  speed: 'normal',
  streak: 2,
  periods: [
    { period: 0, sessions: 2, volume: 2000, duration: 7200, calories: 500, missing_calories: 0 },
    { period: 1, sessions: 1, volume: 1000, duration: 3600, calories: 250, missing_calories: 0 },
  ],
  daily: [
    { day: '2026-10-08', sessions: 1, volume: 1000, duration: 3600 },
    { day: '2026-10-09', sessions: 1, volume: 1000, duration: 3600 },
  ],
  muscles: [{ muscle: 'biceps', sets: 3, volume: 300 }],
  fatigue: [{ muscle: 'biceps', fatigue: 5, last_trained: '2026-10-09T12:00:00Z' }],
  bodyweight: [],
  records: [],
  previous_records: 0,
  rankups: [],
};
const mockGoal: Goal = {
  id: 'goal',
  type: 'custom',
  target: { title: 'Stretch after class', checked: false },
  start_value: 0,
  current_value: 0,
  target_value: 1,
  deadline: null,
  status: 'active',
  auto_post: false,
  achieved_at: null,
  created_at: '2026-10-01',
  observations: [],
};
let mockHasData = true;
// Milestone sharing (Phase 9) talks to the server; these screens only need its shape.
jest.mock('@/lib/social/hooks', () => ({
  useMilestoneMode: () => ({ data: 'ask' }),
  useMilestonePost: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: mockPush }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/lib/auth', () => ({ useUserId: () => 'alice' }));
jest.mock('@/lib/insights', () => ({
  ...jest.requireActual('@/lib/insights/metrics'),
  ...jest.requireActual('@/lib/insights/recovery'),
  ...jest.requireActual('@/lib/insights/schema'),
  useClock: () => mockNow,
  useAnalytics: () => ({
    data: mockHasData ? mockData : undefined,
    isPending: !mockHasData,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
  useGoals: () => ({
    data: [mockGoal],
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
  useSaveGoal: () => ({ mutate: mockMutate, isError: false, isPending: false }),
  useRecoverySpeed: () => ({ mutate: mockSpeed, isError: false, isPending: false }),
}));
jest.mock('@/lib/profile', () => ({
  useProfile: () => ({
    data: { display_name: 'Mayank', experience_level: 'beginner', primary_goal: 'general' },
  }),
  useLatestBodyweight: () => ({ data: { weight_kg: 80 } }),
  useLogBodyweight: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/lib/plans', () => ({
  ...jest.requireActual('@/lib/plans/engine/calendar'),
  useActivePlan: () => ({ data: null }),
}));
jest.mock('@/lib/workouts', () => ({ useActiveWorkout: () => ({ data: null }) }));
jest.mock('@/lib/exercises', () => ({
  useExercisePicker: () => jest.fn(async () => []),
  useExercises: () => ({ data: [] }),
}));
jest.mock('@/lib/leagues', () => ({ useLeagueHome: () => ({ data: undefined }) }));
jest.mock('@/lib/ranks', () => ({
  useServerReads: () => false,
  useRankPredictions: () => ({ data: [] }),
  useRankLadder: () => ({ data: { thresholds: [] } }),
  useRankLifts: () => ({ data: [] }),
}));
jest.mock('expo-sqlite/kv-store', () => ({
  Storage: { getAllKeysSync: () => [], getItemSync: () => null, setItemSync: jest.fn() },
}));

async function mount(element: React.ReactElement) {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      }}
    >
      {element}
    </SafeAreaProvider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  mockHasData = true;
  useSyncStatusStore.setState({ online: true, pending: 0 });
});
afterEach(async () => {
  await act(async () => undefined);
});
test('Home exposes four live entry cards and routes to the right detail', async () => {
  await mount(<ForYouScreen />);
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: /Muscle Analysis\. Biceps/ }));
  expect(mockPush).toHaveBeenCalledWith('/insights/muscles');
  expect(screen.getByRole('button', { name: /Recovery\. 98%/ })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /Goals\. Stretch after class/ })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /Overview\. 2.0 t/ })).toBeOnTheScreen();
});
test('muscle screen renders weighted sets, a selectable measure and accessible map', async () => {
  await mount(<MuscleAnalysisScreen />);
  expect(screen.getByText('3.0 sets · 300 kg')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('radio', { name: 'Volume (kg)' }));
  expect(
    screen.getByRole('image', { name: /Muscle training heat map in volume/ }),
  ).toBeOnTheScreen();
});
test('recovery shows a real least-recovered value and persists speed changes', async () => {
  await mount(<RecoveryScreen />);
  expect(screen.getByText('50%')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('radio', { name: 'Slower' }));
  expect(mockSpeed).toHaveBeenCalledWith('slower');
  expect(screen.getByText(/Sleep, food and stress matter/)).toBeOnTheScreen();
});
test('Overview uses authoritative totals and opens bodyweight logging', async () => {
  await mount(<OverviewScreen />);
  expect(screen.getByText('2,000 kg')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Log bodyweight' }));
  expect(screen.getByLabelText('Bodyweight (kg)')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
});
test('custom completion submits the actual checkbox goal', async () => {
  await mount(<GoalsScreen />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Mark complete' }));
  expect(mockMutate).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'goal',
      target: { title: 'Stretch after class', checked: true },
    }),
  );
});
test('create goal requires a title and submits a bodyweight target', async () => {
  await mount(<GoalForm />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Save goal' }));
  expect(screen.getByText('Give your goal a name.')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Bodyweight' }));
  await fireEvent.changeText(screen.getByLabelText('Goal name'), 'Reach 75 kg');
  await fireEvent.changeText(screen.getByLabelText('Target bodyweight (kg)'), '75');
  await userEvent.setup().press(screen.getByRole('button', { name: 'Save goal' }));
  expect(mockMutate).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'bodyweight',
      target: { title: 'Reach 75 kg', kg: 75 },
      autoPost: false,
    }),
    expect.anything(),
  );
});
test('offline cold start shows an actionable state instead of indefinite loading', async () => {
  mockHasData = false;
  useSyncStatusStore.setState({ online: false });
  await mount(<RecoveryScreen />);
  expect(screen.getByText("Couldn't load your data")).toBeOnTheScreen();
});

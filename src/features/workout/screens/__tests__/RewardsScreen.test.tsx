import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { serverRewards } from '@/lib/ranks/__fixtures__/rewards';
import { parseRewards, type RewardsState } from '@/lib/ranks';
import { useSyncStatusStore } from '@/lib/sync';

import { RewardsScreen, REWARDS_WAIT_MS } from '../RewardsScreen';

/** The summary after Save: waiting for the server, the rank-up reveal, offline, weigh-in prompt. */

let mockState: RewardsState | undefined;
const mockDismissAll = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ dismissAll: mockDismissAll, push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'aaaaaaaa-0000-0000-0000-000000000002' }),
}));
jest.mock('@/lib/profile', () => ({ useProfile: () => ({ data: { units: 'kg' } }) }));
jest.mock('@/lib/ranks/hooks', () => ({
  ...jest.requireActual('@/lib/ranks/hooks'),
  useWorkoutRewards: () => ({ data: mockState }),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const ready = (patch: Record<string, unknown> = {}): RewardsState => {
  const rewards = parseRewards(serverRewards(patch));
  if (!rewards) throw new Error('bad fixture');
  return { status: 'ready', rewards };
};

async function show(state: RewardsState | undefined, online = true) {
  mockState = state;
  useSyncStatusStore.setState({ online });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <RewardsScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(async () => {
  await act(async () => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

it('waits for the server while the workout syncs', async () => {
  await show({ status: 'pending' });
  expect(screen.getByText('Checking your records and ranks…')).toBeTruthy();
});

it('says ranks are on their way when the server is slow', async () => {
  await show({ status: 'pending' });
  await act(async () => jest.advanceTimersByTime(REWARDS_WAIT_MS));
  expect(screen.getByText('Ranks are on their way')).toBeTruthy();
});

it('says it saved on the phone when offline', async () => {
  await show({ status: 'pending' }, false);
  expect(screen.getByText('Saved on this phone')).toBeTruthy();
});

it('reveals the biggest rank-up, then lists records and other changes', async () => {
  await show(ready());
  expect(screen.getByLabelText('Bench press ranked up: Gold II, up from Silver I')).toBeTruthy();
  expect(screen.getByText('2 personal records')).toBeTruthy();
  expect(screen.getByText('Estimated 1RM')).toBeTruthy();
  expect(screen.getByText('Barbell bench press · was 68.8 kg')).toBeTruthy();
  expect(screen.getByText('Most reps at 60 kg')).toBeTruthy();
  // The reveal isn't repeated in the list; the muscle folds into "more".
  expect(screen.getByText('Pull-up')).toBeTruthy();
  expect(screen.getByText('Down from Gold III')).toBeTruthy();
  expect(screen.getByText('1 more rank moved')).toBeTruthy();
  expect(screen.getByText('Placement: 2/5 lifts')).toBeTruthy();

  await userEvent
    .setup({ advanceTimers: jest.advanceTimersByTime })
    .press(screen.getByRole('button', { name: 'Done' }));
  expect(mockDismissAll).toHaveBeenCalled();
});

it('asks for a weigh-in when weighted sets could not rank', async () => {
  await show(ready({ needs_bodyweight: true, rank_changes: [], prs: [] }));
  expect(screen.getByText('Add a weigh-in to rank these lifts')).toBeTruthy();
  expect(
    screen.getByText('No new records or ranks this time. Every set still counts.'),
  ).toBeTruthy();
  await userEvent
    .setup({ advanceTimers: jest.advanceTimersByTime })
    .press(screen.getByRole('button', { name: 'Add weigh-in' }));
  expect(mockPush).toHaveBeenCalledWith('/profile/edit');
});

it('explains flagged sets', async () => {
  await show(ready({ flagged: 1, rank_changes: [], prs: [] }));
  expect(screen.getByText(/One set looks unusually heavy/)).toBeTruthy();
});

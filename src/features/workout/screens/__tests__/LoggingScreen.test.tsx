import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Exercise } from '@/lib/exercises';
import { wexercise, workout, wset } from '@/lib/workouts/__fixtures__/workout';

import { activeSession } from '../../session/store';
import { LoggingScreen } from '../LoggingScreen';

/**
 * The logging screen with its data sources mocked: ticking a set (and how long that takes on a
 * 12-exercise session), the rest timer, the superset flow, and the keypad.
 */

function mockExercise(id: string, name: string): Exercise {
  return {
    id,
    slug: id,
    name,
    aliases: [],
    category: 'strength',
    equipment: 'barbell',
    mechanic: 'compound',
    logType: 'weight_reps',
    unilateral: false,
    instructions: [],
    tips: [],
    commonMistakes: [],
    mediaUrl: null,
    metValue: 6,
    isRankable: true,
    rankKey: null,
    createdBy: null,
    updatedAt: 'now',
    muscles: [{ muscle: 'quads', role: 'primary', weight: 1 }],
  };
}

const mockLibrary = Array.from({ length: 12 }, (_, i) => mockExercise(`ex${i}`, `Lift ${i}`));
const mockSaveActive = jest.fn(async (doc: unknown) => doc);
const mockScheduleRest = jest.fn(async () => 'notification-1');

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), dismissAll: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => undefined }));
jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };
});
jest.mock('@/lib/exercises', () => ({
  ...jest.requireActual('@/lib/exercises/taxonomy'),
  ...jest.requireActual('@/lib/exercises/types'),
  useExercises: () => ({ data: mockLibrary }),
  useExercisePicker: () => jest.fn(async () => []),
}));
jest.mock('@/lib/profile', () => ({
  useProfile: () => ({ data: { units: 'kg', visibility: 'friends' } }),
  useTrainingSettings: () => ({
    effort_metric: 'rir',
    rest_timer_default_sec: 120,
    bar_weight_kg: 20,
    plate_inventory: [],
  }),
  readCachedBodyweight: () => 72,
}));
jest.mock('@/lib/sync', () => ({
  runSync: jest.fn(async () => ({ pushed: 0, failed: 0 })),
  registerSyncHandler: jest.fn(),
  pendingIds: jest.fn(async () => new Set()),
  useSyncStatus: () => ({ state: 'synced', pending: 0 }),
}));
jest.mock('@/lib/workouts/repository', () => ({
  saveActiveWorkout: (doc: unknown) => mockSaveActive(doc),
  saveRuntime: jest.fn(async () => undefined),
}));
jest.mock('@/lib/workouts/hooks', () => ({
  usePreviousSets: () => ({ data: new Map() }),
  useDiscardWorkout: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/lib/workouts/photo', () => ({}));
jest.mock('@/lib/workouts/api', () => ({}));
jest.mock('@/lib/workouts/sync', () => ({ registerWorkoutSync: jest.fn() }));
jest.mock('../../session/restNotifications', () => ({
  scheduleRestDone: () => mockScheduleRest(),
  cancelRestDone: jest.fn(),
  notifyPermission: async () => 'granted',
  requestNotifyPermission: async () => true,
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderScreen() {
  const client = new QueryClient();
  await render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={METRICS}>
        <LoggingScreen />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

/** 12 exercises × 5 sets; the first two are a superset (no rest between, 90 s after the round). */
function bigSession() {
  return workout({
    name: 'Leg day',
    startedAt: new Date().toISOString(),
    exercises: mockLibrary.map((e, i) =>
      wexercise({
        exerciseId: e.id,
        restSeconds: i < 2 ? 0 : 150,
        supersetGroup: i < 2 ? 1 : null,
        restAfterSupersetSeconds: i < 2 ? 90 : null,
        sets: Array.from({ length: 5 }, () =>
          wset({ targetType: 'reps', targetReps: 5, targetWeightKg: 100 }),
        ),
      }),
    ),
  });
}

beforeEach(() => {
  // Real performance.now(), so the tick timing below measures something.
  jest.useFakeTimers({ doNotFake: ['performance'] });
  mockSaveActive.mockClear();
  activeSession.getState().load(bigSession());
});
afterEach(async () => {
  await act(async () => {
    activeSession.getState().reset();
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

it('ticks a set straight away, from memory, with the target filled in', async () => {
  await renderScreen();
  // Warm up (first render of the rest sheet, JIT), then measure a second tick.
  await fireEvent.press(screen.getByLabelText('Lift 5, set 1 done'));
  await fireEvent.press(screen.getByLabelText('Skip rest'));

  const started = performance.now();
  await fireEvent.press(screen.getByLabelText('Lift 2, set 1 done'));
  const elapsed = performance.now() - started;

  expect(screen.getByLabelText('Lift 2, set 1 done')).toBeChecked();
  const set = activeSession.getState().doc!.exercises[2]!.sets[0]!;
  expect(set).toMatchObject({ completed: true, weightKg: 100, reps: 5 });
  // Jest isn't a phone, but a tick that re-rendered the whole 60-set screen would blow this.
  expect(elapsed).toBeLessThan(100);
  // The database write follows a moment later, off the tap.
  expect(mockSaveActive).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  expect(mockSaveActive).toHaveBeenCalledTimes(1);
});

it('starts the rest for the exercise and focuses its next set', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await renderScreen();
  await user.press(screen.getByLabelText('Lift 2, set 1 done'));

  const { runtime, focus, sheet } = activeSession.getState();
  expect(runtime.rest?.totalSec).toBe(150);
  expect(runtime.rest?.nextLabel).toBe('Lift 2, set 2');
  expect(sheet).toEqual({ kind: 'rest' });
  expect(focus?.setId).toBe(activeSession.getState().doc!.exercises[2]!.sets[1]!.id);
  expect(await screen.findByText('Up next: Lift 2, set 2')).toBeOnTheScreen();
  expect(mockScheduleRest).toHaveBeenCalled();

  await user.press(screen.getByLabelText('Skip rest'));
  expect(activeSession.getState().runtime.rest).toBeNull();
});

it('goes A1 → A2 without rest, then rests after the round', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await renderScreen();
  const [a1, a2] = activeSession.getState().doc!.exercises;

  await user.press(screen.getByLabelText('Lift 0, set 1 done'));
  expect(activeSession.getState().runtime.rest).toBeNull();
  expect(activeSession.getState().focus).toEqual({ exerciseId: a2!.id, setId: a2!.sets[0]!.id });

  await user.press(screen.getByLabelText('Lift 1, set 1 done'));
  expect(activeSession.getState().runtime.rest?.totalSec).toBe(90);
  expect(activeSession.getState().focus).toEqual({ exerciseId: a1!.id, setId: a1!.sets[1]!.id });
});

it('logs a weight and reps with the keypad', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await renderScreen();
  await user.press(screen.getByLabelText('Lift 3, set 2, Weight (kg)'));
  // Empty cell: +2.5 starts from the suggestion (the 100 kg target).
  await user.press(screen.getByLabelText('Plus 2.5'));
  await user.press(screen.getByLabelText('Next value'));
  await user.press(screen.getByLabelText('6'));
  await user.press(screen.getByText('Done'));

  const set = activeSession.getState().doc!.exercises[3]!.sets[1]!;
  expect(set).toMatchObject({ weightKg: 102.5, reps: 6, completed: false });
  expect(activeSession.getState().keypad).toBeNull();
});

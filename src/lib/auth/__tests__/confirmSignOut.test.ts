import { Alert, type AlertButton } from 'react-native';

import { flushNow, pendingSummary, summarisePending, type PendingSummary } from '@/lib/sync';

import { confirmSignOut, pendingMessage } from '../confirmSignOut';
import { signOut } from '../signOut';

jest.mock('../signOut', () => ({ signOut: jest.fn(async () => undefined) }));
jest.mock('@/lib/sync', () => ({
  ...jest.requireActual('@/lib/sync/pending'),
  flushNow: jest.fn(async () => ({ pushed: 0, failed: 0 })),
  pendingSummary: jest.fn(),
}));

const summary = jest.mocked(pendingSummary);
const flush = jest.mocked(flushNow);
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

const offlineWorkout = summarisePending([
  { entity: 'workout', entityId: 'w1' },
  { entity: 'workout_photo', entityId: 'w1' },
  { entity: 'workout', entityId: 'w2' },
  { entity: 'routine', entityId: 'r1' },
]);

/** Presses a button on the latest alert. */
function press(text: string) {
  const buttons = (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  const button = buttons.find((b) => b.text === text);
  if (!button?.onPress) throw new Error(`No "${text}" button`);
  button.onPress();
}

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => jest.clearAllMocks());

it('signs out straight away when nothing is waiting to sync', async () => {
  summary.mockResolvedValue(summarisePending([]));
  await confirmSignOut();
  expect(alert).not.toHaveBeenCalled();
  expect(signOut).toHaveBeenCalledTimes(1);
});

it('warns with the count before dropping unsynced changes', async () => {
  summary.mockResolvedValue(offlineWorkout);
  const done = confirmSignOut();
  await flushPromises();

  expect(alert).toHaveBeenCalledWith(
    '3 unsynced changes',
    '2 workouts and 1 routine are saved only on this phone. If you sign out now, they’re lost.',
    expect.any(Array),
    expect.objectContaining({ cancelable: true }),
  );
  expect(signOut).not.toHaveBeenCalled();

  press('Sign out anyway');
  await done;
  expect(signOut).toHaveBeenCalledTimes(1);
});

it('cancel keeps the account and the data', async () => {
  summary.mockResolvedValue(offlineWorkout);
  const done = confirmSignOut();
  await flushPromises();
  press('Cancel');
  await done;
  expect(signOut).not.toHaveBeenCalled();
});

it('syncs first and signs out once the outbox is empty', async () => {
  summary.mockResolvedValueOnce(offlineWorkout).mockResolvedValueOnce(summarisePending([]));
  const done = confirmSignOut();
  await flushPromises();
  press('Try to sync first');
  await done;
  expect(flush).toHaveBeenCalledTimes(1);
  expect(alert).toHaveBeenCalledTimes(1);
  expect(signOut).toHaveBeenCalledTimes(1);
});

it('asks again with the new count when the sync could not finish', async () => {
  const stillOne = summarisePending([{ entity: 'workout', entityId: 'w2' }]);
  summary.mockResolvedValueOnce(offlineWorkout).mockResolvedValueOnce(stillOne);
  const done = confirmSignOut();
  await flushPromises();
  press('Try to sync first');
  await flushPromises();

  expect(signOut).not.toHaveBeenCalled();
  expect(alert).toHaveBeenLastCalledWith(
    '1 unsynced change',
    'Couldn’t sync yet. Check your connection. 1 workout is saved only on this phone. If you sign out now, it’s lost.',
    expect.any(Array),
    expect.anything(),
  );

  press('Sign out anyway');
  await done;
  expect(signOut).toHaveBeenCalledTimes(1);
});

describe('pendingMessage', () => {
  const of = (p: Partial<PendingSummary>): PendingSummary => {
    const s = { workouts: 0, photos: 0, routines: 0, folders: 0, plans: 0, ...p };
    return { ...s, total: s.workouts + s.photos + s.routines + s.folders + s.plans };
  };

  it('lists every kind that is waiting', () => {
    expect(pendingMessage(of({ workouts: 1, photos: 1, routines: 2, folders: 1 }))).toBe(
      '1 workout, 1 workout photo, 2 routines and 1 folder are saved only on this phone. If you sign out now, they’re lost.',
    );
  });

  it('counts a photo with its workout as one change', () => {
    expect(
      summarisePending([
        { entity: 'workout', entityId: 'w1' },
        { entity: 'workout_photo', entityId: 'w1' },
        { entity: 'workout_photo', entityId: 'w9' },
      ]),
    ).toMatchObject({ total: 2, workouts: 1, photos: 1 });
  });
});

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { clearUserExerciseData } from '@/lib/exercises/repository';
import { clearPlanData } from '@/lib/plans/repository';
import { clearRoutineData } from '@/lib/routines/repository';
import { queryClient } from '@/lib/queryClient';
import { getSupabase } from '@/lib/supabase';
import { clearQueue } from '@/lib/sync/queue';
import { clearWorkoutData } from '@/lib/workouts/repository';

import { useAuthStore } from '../authStore';
import { useAuthBootstrap } from '../useAuthBootstrap';

jest.mock('@/lib/exercises/repository', () => ({
  clearUserExerciseData: jest.fn(async () => undefined),
}));
jest.mock('@/lib/plans/repository', () => ({ clearPlanData: jest.fn(async () => undefined) }));
jest.mock('@/lib/routines/repository', () => ({
  clearRoutineData: jest.fn(async () => undefined),
}));
jest.mock('@/lib/workouts/repository', () => ({
  clearWorkoutData: jest.fn(async () => undefined),
}));
jest.mock('../accountCache', () => ({ clearAccountCache: jest.fn() }));
jest.mock('@/lib/sync/queue', () => ({ clearQueue: jest.fn(async () => undefined) }));
jest.mock('@/lib/sync/runner', () => ({
  stopSync: jest.fn(),
  waitForSync: jest.fn(async () => undefined),
}));
jest.mock('@/lib/queryClient', () => ({ queryClient: { clear: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({ getSupabase: jest.fn(), isSupabaseConfigured: () => true }));

function session(id: string): Session {
  return {
    access_token: 'test',
    refresh_token: 'test',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' },
  };
}

let listener: (event: AuthChangeEvent, value: Session | null) => void;
const auth = {
  getSession: jest.fn(async (): Promise<{ data: { session: Session | null } }> => ({
    data: { session: session('a') },
  })),
  onAuthStateChange: jest.fn((callback: typeof listener) => {
    listener = callback;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  }),
  startAutoRefresh: jest.fn(),
  stopAutoRefresh: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ session: null, status: 'loading', preview: false });
  auth.getSession.mockImplementation(async () => ({ data: { session: session('a') } }));
  jest.mocked(getSupabase).mockReturnValue({ auth } as unknown as ReturnType<typeof getSupabase>);
});

it('keeps protected screens closed until sign-out cleanup and pending saves finish', async () => {
  let release!: () => void;
  const beforeClear = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  await renderHook(() => useAuthBootstrap(beforeClear));
  await waitFor(() => expect(useAuthStore.getState().session?.user.id).toBe('a'));
  await act(() => listener('SIGNED_OUT', null));
  expect(useAuthStore.getState()).toMatchObject({
    status: 'loading',
    session: null,
    preview: false,
  });
  expect(clearQueue).not.toHaveBeenCalled();
  await act(async () => release());
  await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'));
  for (const clear of [
    clearQueue,
    clearPlanData,
    clearWorkoutData,
    clearRoutineData,
    clearUserExerciseData,
  ]) {
    expect(clear).toHaveBeenCalledTimes(1);
  }
  expect(queryClient.clear).toHaveBeenCalledTimes(1);
});

it('also clears cached data for a direct switch to a different account', async () => {
  await renderHook(() => useAuthBootstrap());
  await waitFor(() => expect(useAuthStore.getState().session?.user.id).toBe('a'));
  await act(() => listener('SIGNED_IN', session('b')));
  await waitFor(() => expect(useAuthStore.getState().session?.user.id).toBe('b'));
  expect(clearWorkoutData).toHaveBeenCalledTimes(1);
});

it('does not let a late initial session overwrite a newer auth event', async () => {
  let resolve!: (value: { data: { session: Session | null } }) => void;
  auth.getSession.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await renderHook(() => useAuthBootstrap());
  await act(() => listener('SIGNED_IN', session('b')));
  await act(async () => resolve({ data: { session: session('a') } }));
  expect(useAuthStore.getState().session?.user.id).toBe('b');
});

it('boots signed out if restoring the session rejects', async () => {
  auth.getSession.mockRejectedValueOnce(new Error('Storage failed'));
  await renderHook(() => useAuthBootstrap());
  await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'));
});

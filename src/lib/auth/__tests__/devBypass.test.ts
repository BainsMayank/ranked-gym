import type { Session } from '@supabase/supabase-js';
import { renderHook } from '@testing-library/react-native';

import { useAuthStore } from '../authStore';
import { useAuthGate } from '../useAuthGate';

jest.mock('@/lib/profile/useProfile', () => ({
  useProfile: () => ({
    data: { onboarded_at: null },
    isError: false,
    fetchStatus: 'idle',
  }),
}));
jest.mock('@/lib/profile/onboardedCache', () => ({ readOnboarded: () => false }));

const originalDev = __DEV__;
const originalOverride = process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS;
const session = { user: { id: 'test-lifter' } } as Session;

beforeEach(() => {
  Object.defineProperty(globalThis, '__DEV__', { value: true, configurable: true });
  delete process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS;
  useAuthStore.setState({ status: 'loading', session: null, preview: false });
});

afterEach(() => {
  Object.defineProperty(globalThis, '__DEV__', { value: originalDev, configurable: true });
  if (originalOverride === undefined) delete process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS;
  else process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = originalOverride;
  useAuthStore.setState({ status: 'loading', session: null, preview: false });
});

it('waits for session restoration before opening the app', async () => {
  const { result } = await renderHook(useAuthGate);
  expect(result.current.screen).toBe('loading');
});

it('opens directly into preview when no saved account exists, on every cold start', async () => {
  for (let launch = 0; launch < 2; launch++) {
    useAuthStore.setState({ status: 'loading', session: null, preview: false });
    useAuthStore.getState().setSession(null);
    const { result, unmount } = await renderHook(useAuthGate);
    expect(result.current.screen).toBe('app');
    expect(useAuthStore.getState()).toMatchObject({ session: null, preview: true });
    await unmount();
  }
});

it('preserves a restored session and skips unfinished onboarding in development', async () => {
  useAuthStore.getState().setSession(session);
  const { result } = await renderHook(useAuthGate);
  expect(result.current.screen).toBe('app');
  expect(useAuthStore.getState()).toMatchObject({ session, preview: false });
});

it('returns to login when the development bypass is disabled', async () => {
  process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = 'false';
  useAuthStore.getState().setSession(null);
  const { result } = await renderHook(useAuthGate);
  expect(result.current.screen).toBe('auth');
});

it('requires unfinished onboarding when the development bypass is disabled', async () => {
  process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = 'false';
  useAuthStore.getState().setSession(session);
  const { result } = await renderHook(useAuthGate);
  expect(result.current.screen).toBe('onboarding');
});

it.each([undefined, 'true'])('requires login in release builds with override %s', async (value) => {
  Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
  if (value !== undefined) process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = value;
  useAuthStore.getState().setSession(null);
  useAuthStore.getState().setPreview(true);
  const { result } = await renderHook(useAuthGate);
  expect(result.current.screen).toBe('auth');
  expect(useAuthStore.getState().preview).toBe(false);
});

it('requires unfinished onboarding in release builds even with the bypass flag enabled', async () => {
  Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
  process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = 'true';
  useAuthStore.getState().setSession(session);
  const { result } = await renderHook(useAuthGate);
  expect(result.current.screen).toBe('onboarding');
});

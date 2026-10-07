import * as SecureStore from 'expo-secure-store';

import { CHUNK_SIZE, secureStorage } from '../secureStorage';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error(`Invalid key ${k}`);
      if (v.length > 500) throw new Error('Value too large');
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      store.delete(k);
    }),
  };
});

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => store.clear());

describe('secureStorage', () => {
  it('returns null for a missing key', async () => {
    expect(await secureStorage.getItem('sb-ref-auth-token')).toBeNull();
  });

  it('round-trips a value larger than one chunk', async () => {
    const session = JSON.stringify({ access_token: 'x'.repeat(2400), user: { name: 'Āsha ₹' } });
    await secureStorage.setItem('sb-ref-auth-token', session);
    expect(await secureStorage.getItem('sb-ref-auth-token')).toBe(session);
    expect(store.get('sb-ref-auth-token.n')).toBe(String(Math.ceil(session.length / CHUNK_SIZE)));
  });

  it('removes stale chunks when a value shrinks', async () => {
    await secureStorage.setItem('k', 'a'.repeat(CHUNK_SIZE * 3));
    await secureStorage.setItem('k', 'short');
    expect(await secureStorage.getItem('k')).toBe('short');
    expect(store.has('k.1')).toBe(false);
    expect(store.has('k.2')).toBe(false);
  });

  it('removes every chunk', async () => {
    await secureStorage.setItem('k', 'b'.repeat(CHUNK_SIZE * 2 + 1));
    await secureStorage.removeItem('k');
    expect(store.size).toBe(0);
    expect(await secureStorage.getItem('k')).toBeNull();
  });

  it('treats a half-written value as missing', async () => {
    await secureStorage.setItem('k', 'c'.repeat(CHUNK_SIZE * 2));
    store.delete('k.1');
    expect(await secureStorage.getItem('k')).toBeNull();
  });

  it('sanitises keys SecureStore would reject', async () => {
    await secureStorage.setItem('sb:ref/auth token', 'v');
    expect(await secureStorage.getItem('sb:ref/auth token')).toBe('v');
  });

  it('stores an empty string', async () => {
    await secureStorage.setItem('k', '');
    expect(await secureStorage.getItem('k')).toBe('');
  });
});

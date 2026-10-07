import * as SecureStore from 'expo-secure-store';

/**
 * Supabase auth storage backed by the iOS Keychain / Android Keystore.
 *
 * SecureStore can reject values over ~2 KB and a Supabase session (JWTs plus user metadata) is
 * usually 3–4 KB, so values are split into chunks: `<key>.n` holds the chunk count and
 * `<key>.0` … `<key>.n-1` the parts. Chunks are short enough that even 4-byte UTF-8 characters stay
 * under the limit.
 */
export const CHUNK_SIZE = 500;

const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

// Keys may only use letters, numbers, '.', '-' and '_'.
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const n = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function deleteChunks(key: string, from: number, to: number): Promise<void> {
  for (let i = from; i < to; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
}

export const secureStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = safeKey(rawKey);
    const count = await readCount(key);
    if (count === 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      // A missing chunk means a half-written value: treat it as signed out rather than corrupt.
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(rawKey: string, value: string): Promise<void> {
    const key = safeKey(rawKey);
    const previous = await readCount(key);
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE));
    if (chunks.length === 0) chunks.push('');

    // Write the parts first and the count last, so a crash mid-write never points at missing parts.
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), chunks[i] ?? '');
    }
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    await deleteChunks(key, chunks.length, previous);
  },

  async removeItem(rawKey: string): Promise<void> {
    const key = safeKey(rawKey);
    const count = await readCount(key);
    await SecureStore.deleteItemAsync(countKey(key));
    await deleteChunks(key, 0, count);
  },
};

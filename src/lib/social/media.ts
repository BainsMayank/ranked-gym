import { useQuery } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { compressPhoto, type CompressedPhoto } from '@/lib/photos/compress';
import { getSupabase } from '@/lib/supabase';

import type { PostMedia } from './types';

export const POST_MEDIA_BUCKET = 'post-media';
export const WORKOUT_PHOTO_BUCKET = 'workout-photos';
export const MAX_POST_PHOTOS = 4;

export type MediaBucket = typeof POST_MEDIA_BUCKET | typeof WORKOUT_PHOTO_BUCKET;

/**
 * Picks up to `max` photos and re-encodes each (resized to 1600px, EXIF and GPS stripped). The
 * system picker needs no permission prompt: it only hands over what the user chose.
 */
export async function pickPostPhotos(max: number): Promise<CompressedPhoto[]> {
  if (max <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: max > 1,
    selectionLimit: max,
    quality: 1,
    exif: false,
  });
  if (result.canceled) return [];
  return Promise.all(
    result.assets.slice(0, max).map((a) => compressPhoto(a.uri, a.width, a.height)),
  );
}

/** Uploads a post's photos to <user>/<post>/<n>.jpg (replays overwrite the same files). */
export async function uploadPostPhotos(
  userId: string,
  postId: string,
  photos: readonly CompressedPhoto[],
): Promise<PostMedia[]> {
  const storage = getSupabase().storage.from(POST_MEDIA_BUCKET);
  return Promise.all(
    photos.map(async (p, i) => {
      const path = `${userId}/${postId}/${i}.jpg`;
      const bytes = await new File(p.uri).arrayBuffer();
      const { error } = await storage.upload(path, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (error) throw error;
      return { path, w: p.width, h: p.height };
    }),
  );
}

// ─── Signed URLs, batched ───────────────────────────────────────────────────────────────────────

const LINK_SECONDS = 3600;

type Waiter = { resolve: (url: string | null) => void; reject: (e: unknown) => void };
const queues = new Map<MediaBucket, Map<string, Waiter[]>>();

async function flush(bucket: MediaBucket) {
  const queue = queues.get(bucket);
  queues.delete(bucket);
  if (!queue) return;
  const paths = [...queue.keys()];
  try {
    const { data, error } = await getSupabase()
      .storage.from(bucket)
      .createSignedUrls(paths, LINK_SECONDS);
    if (error) throw error;
    const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
    for (const [path, waiters] of queue) {
      for (const w of waiters) w.resolve(byPath.get(path) ?? null);
    }
  } catch (e) {
    for (const waiters of queue.values()) for (const w of waiters) w.reject(e);
  }
}

/** Collects the links a screen asks for in one frame into one storage request. */
export function signedUrl(bucket: MediaBucket, path: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let queue = queues.get(bucket);
    if (!queue) {
      queue = new Map();
      queues.set(bucket, queue);
      setTimeout(() => void flush(bucket), 16);
    }
    queue.set(path, [...(queue.get(path) ?? []), { resolve, reject }]);
  });
}

/**
 * A short-lived link for a stored photo. Images cache by path (`cacheKey`), so a fresh link for
 * the same photo never downloads it again.
 */
export function useMediaUrl(bucket: MediaBucket, path: string | null) {
  return useQuery({
    queryKey: ['social', 'media', bucket, path],
    queryFn: () => (path ? signedUrl(bucket, path) : null),
    enabled: !!path,
    staleTime: (LINK_SECONDS - 300) * 1000,
    gcTime: LINK_SECONDS * 1000,
  });
}

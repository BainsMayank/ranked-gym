import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Exercise } from './types';

/**
 * The exercise picker is a route (/exercises/pick), so any screen can open it and await the result:
 *
 *   const pickExercises = useExercisePicker();
 *   const picked = await pickExercises({ multiple: true }); // [] if cancelled
 *
 * Resolvers live in memory keyed by a request id that travels as a route param. The picker
 * resolves on confirm, and with [] when it closes any other way.
 */

type Resolve = (picked: Exercise[]) => void;

const pending = new Map<string, Resolve>();
let counter = 0;

export function createPickRequest(resolve: Resolve): string {
  counter += 1;
  const id = `pick-${Date.now()}-${counter}`;
  pending.set(id, resolve);
  return id;
}

/** Settles a request once; later calls are ignored. */
export function resolvePickRequest(id: string, picked: Exercise[]): void {
  const resolve = pending.get(id);
  pending.delete(id);
  resolve?.(picked);
}

export interface PickOptions {
  /** Pick several at once (routine builder, live session). */
  multiple?: boolean;
  /** Ids to show as already added. */
  exclude?: readonly string[];
}

export function useExercisePicker() {
  const router = useRouter();
  return useCallback(
    (options: PickOptions = {}) =>
      new Promise<Exercise[]>((resolve) => {
        const request = createPickRequest(resolve);
        router.push({
          pathname: '/exercises/pick',
          params: {
            request,
            multiple: options.multiple ? '1' : '0',
            exclude: (options.exclude ?? []).join(','),
          },
        });
      }),
    [router],
  );
}

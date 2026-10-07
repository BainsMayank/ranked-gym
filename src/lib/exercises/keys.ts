/** TanStack Query keys for the exercise library. */
export const exerciseKeys = {
  all: ['exercises'] as const,
  /** The local (SQLite) library: official + custom. */
  library: ['exercises', 'library'] as const,
  usage: ['exercises', 'usage'] as const,
  sync: (userId: string) => ['exercises', 'sync', userId] as const,
};

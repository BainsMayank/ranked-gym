/** TanStack Query keys for profile data. Everything is scoped by user id. */
export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: string) => ['profile', userId] as const,
  bodyweight: (userId: string) => ['bodyweight', userId] as const,
  settings: (userId: string) => ['user-settings', userId] as const,
  username: (name: string) => ['username-available', name] as const,
};

/** Skip account screens during development; release builds always use the normal auth flow. */
export function isDevAuthBypassEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS !== 'false';
}

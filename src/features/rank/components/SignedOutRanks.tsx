import { EmptyState } from '@/components';

/** The dev preview browses signed out; ranks, records and leagues need an account. */
export function SignedOutRanks({ what = 'ranks' }: { what?: string }) {
  return (
    <EmptyState
      icon="person-circle-outline"
      title={`Sign in to see your ${what}`}
      description="Ranks, records and leagues are worked out on the server from the workouts you sync."
    />
  );
}

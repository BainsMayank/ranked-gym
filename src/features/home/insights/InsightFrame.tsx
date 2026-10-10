import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, Screen, Skeleton, Text } from '@/components';
import { useSyncStatusStore } from '@/lib/sync/status';
import { useAuthStore } from '@/lib/auth/authStore';

export interface DataState {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  data: unknown;
  refetch: () => Promise<unknown>;
}
export function InsightFrame({
  title,
  query,
  children,
  footer,
  scroll = true,
}: {
  title: string;
  query: DataState;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const router = useRouter();
  const online = useSyncStatusStore((s) => s.online);
  return (
    <Screen
      title={title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
      scroll={scroll}
      edges={['top', 'bottom']}
      className="gap-lg"
      footer={footer}
      onRefresh={() => void query.refetch()}
      refreshing={query.isFetching && !query.isPending}
    >
      <DataNotice query={query} />
      {query.data ? (
        children
      ) : query.isError || !online ? (
        <EmptyState
          title="Couldn't load your data"
          description="Your logged workouts are safe. Try again when connected."
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <View className="gap-lg">
          <Skeleton height={160} />
          <Skeleton height={80} />
          <Skeleton height={160} />
        </View>
      )}
    </Screen>
  );
}
export function DataNotice({ query }: { query: DataState }) {
  const preview = useAuthStore((s) => s.preview && !s.session);
  const online = useSyncStatusStore((s) => s.online);
  const pending = useSyncStatusStore((s) => s.pending);
  if (preview)
    return (
      <Text variant="caption" tone="muted">
        Device preview. Numbers use workouts saved on this phone. Ranks and sharing require an
        account.
      </Text>
    );
  if (online && !query.isError && !pending) return null;
  return (
    <View className="gap-xs py-sm">
      <Text variant="caption" tone="muted">
        {!online
          ? 'Offline. Showing the last saved numbers; unsynced workouts appear after reconnecting.'
          : query.isError
            ? 'Refresh failed. Showing the last saved numbers.'
            : 'Sync pending. Numbers include synced workouts only.'}
      </Text>
      {online ? (
        <Button
          label="Retry refresh"
          variant="ghost"
          size="sm"
          onPress={() => void query.refetch()}
        />
      ) : null}
    </View>
  );
}

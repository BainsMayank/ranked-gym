import { View } from 'react-native';

import { useSyncStatus, type SyncState } from '@/lib/sync';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const COPY: Record<SyncState, { icon: IconName; short: string; label: string }> = {
  synced: { icon: 'cloud-done-outline', short: 'Synced', label: 'Everything is synced' },
  syncing: { icon: 'cloud-upload-outline', short: 'Syncing', label: 'Syncing now' },
  pending: {
    icon: 'cloud-upload-outline',
    short: 'Waiting',
    label: 'Saved on this phone, syncing soon',
  },
  offline: {
    icon: 'cloud-offline-outline',
    short: 'Offline',
    label: 'Offline. Saved on this phone, syncs when you are back online',
  },
  error: {
    icon: 'alert-circle-outline',
    short: 'Not synced',
    label: 'Some changes could not sync yet. Retrying',
  },
};

export interface SyncStatusProps {
  /** Show the word next to the icon (lists and settings); the icon alone in tight headers. */
  showLabel?: boolean;
}

/**
 * Small sync indicator: a cloud that says whether local changes have reached the server. Neutral
 * when all is well; the warning colour only when something keeps failing.
 */
export function SyncStatus({ showLabel = false }: SyncStatusProps) {
  const { state, pending } = useSyncStatus();
  const copy = COPY[state];
  const count = state === 'pending' || state === 'offline' ? ` (${pending})` : '';
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${copy.label}${count}`}
      className="flex-row items-center gap-xs"
    >
      <Icon name={copy.icon} size={18} tone={state === 'error' ? 'warning' : 'textMuted'} />
      {showLabel ? (
        <Text variant="caption" tone={state === 'error' ? 'warning' : 'muted'} numeric>
          {copy.short}
          {count}
        </Text>
      ) : null}
    </View>
  );
}

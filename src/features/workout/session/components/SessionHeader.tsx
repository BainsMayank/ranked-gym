import { Pressable, View } from 'react-native';

import { Button, Icon, IconButton, SyncStatus, Text } from '@/components';

import { useSession, useSessionStore } from '../store';
import { ElapsedClock } from './ElapsedClock';

interface SessionHeaderProps {
  onMinimise: () => void;
  onFinish: () => void;
}

/** Minimise, the workout name (tap to rename), elapsed time, sync state and Finish. */
export function SessionHeader({ onMinimise, onFinish }: SessionHeaderProps) {
  const store = useSessionStore();
  const name = useSession((s) => s.doc?.name ?? '');
  const startedAt = useSession((s) => s.doc?.startedAt);
  const editing = useSession((s) => s.mode === 'edit');

  return (
    <View className="flex-row items-center gap-sm px-lg pb-sm pt-sm">
      <IconButton
        icon={editing ? 'close' : 'chevron-down'}
        accessibilityLabel={editing ? 'Close' : 'Minimise workout'}
        variant="surface"
        onPress={onMinimise}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Workout name, ${name}. Rename`}
        onPress={() => store.getState().openSheet({ kind: 'rename' })}
        className="flex-1 active:opacity-70"
      >
        <View className="flex-row items-center gap-xs">
          <Text variant="label" tone="muted" numberOfLines={1} className="shrink">
            {name}
          </Text>
          <Icon name="pencil" size={12} tone="textMuted" />
        </View>
        {startedAt && !editing ? <ElapsedClock startedAt={startedAt} variant="heading" /> : null}
        {editing ? <Text variant="heading">Edit workout</Text> : null}
      </Pressable>
      {editing ? null : <SyncStatus />}
      <Button label={editing ? 'Save' : 'Finish'} size="sm" onPress={onFinish} />
    </View>
  );
}

import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, EmptyState, Icon, IconButton, Text } from '@/components';
import type { RoutineFolder } from '@/lib/routines';

/** Folder heading inside the routine list, with its menu (real folders only). */
export function FolderHeader({
  folder,
  count,
  onMenu,
}: {
  folder: RoutineFolder | null;
  count: number;
  onMenu: (folder: RoutineFolder) => void;
}) {
  const name = folder?.name ?? 'No folder';
  return (
    <View className="min-h-11 flex-row items-center gap-sm pb-xs pt-md" accessibilityRole="header">
      <Icon name={folder ? 'folder-outline' : 'albums-outline'} size={16} tone="textMuted" />
      <Text variant="label" className="flex-shrink" numberOfLines={1}>
        {name}
      </Text>
      <Text variant="label" tone="muted" numeric className="flex-1">
        {count}
      </Text>
      {folder ? (
        <IconButton
          icon="ellipsis-horizontal"
          size="sm"
          accessibilityLabel={`${name} folder options`}
          onPress={() => onMenu(folder)}
        />
      ) : null}
    </View>
  );
}

export function ArchivedToggle({
  count,
  open,
  onToggle,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${open ? 'Hide' : 'Show'} ${count} archived ${count === 1 ? 'routine' : 'routines'}`}
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      className="min-h-11 flex-row items-center gap-sm pb-xs pt-md active:opacity-70"
    >
      <Icon name="archive-outline" size={16} tone="textMuted" />
      <Text variant="label" tone="muted" className="flex-1">
        Archived · {count}
      </Text>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} tone="textMuted" />
    </Pressable>
  );
}

/** No routines yet (start one or add a starter), or nothing matches the search. */
export function RoutinesEmpty({ searching }: { searching: boolean }) {
  const router = useRouter();
  if (searching) {
    return (
      <EmptyState
        icon="search"
        title="No routines match"
        description="Search by routine name or by an exercise in it."
      />
    );
  }
  return (
    <View className="gap-sm">
      <EmptyState
        icon="barbell-outline"
        title="No routines yet"
        description="Build your own, or add a starter routine with one tap and change it later."
        action={{ label: 'Create routine', onPress: () => router.push('/routine/new') }}
      />
      <Button
        label="Browse starter routines"
        variant="outline"
        onPress={() => router.push('/routines/templates')}
      />
    </View>
  );
}

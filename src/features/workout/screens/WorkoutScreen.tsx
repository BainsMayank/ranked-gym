import { FlashList } from '@shopify/flash-list';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import {
  Button,
  Icon,
  IconButton,
  ListGroup,
  ListItem,
  Screen,
  SearchField,
  SectionHeader,
  Skeleton,
  Text,
  useTabBarInset,
} from '@/components';
import { useExercises, type Exercise } from '@/lib/exercises';
import {
  useDeleteFolder,
  useRoutineFolders,
  useSaveFolder,
  type RoutineFolder,
  type RoutineListItem,
} from '@/lib/routines';

import { FolderPickerSheet } from '../components/FolderPickerSheet';
import { ArchivedToggle, FolderHeader, RoutinesEmpty } from '../components/HubRows';
import { FolderActionsSheet, FolderNameSheet, RoutineActionsSheet } from '../components/HubSheets';
import { PlanCard } from '../components/PlanCard';
import { RoutineRow, type RoutineAction } from '../components/RoutineRow';
import { StartOptions } from '../components/StartOptions';
import { useRoutineActions } from '../hooks/useRoutineActions';
import { useRoutineHub, type HubItem } from '../hooks/useRoutineHub';

/** Workout tab: your plan, ways to start a session, and your routines (grouped by folder). */
export function WorkoutScreen() {
  const router = useRouter();
  const tabBarInset = useTabBarInset();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const actions = useRoutineActions();
  const { items, loading, total } = useRoutineHub(query, showArchived, actions.hidden);
  const { data: exercises } = useExercises();
  const { data: folders = [] } = useRoutineFolders();
  const saveFolder = useSaveFolder();
  const deleteFolder = useDeleteFolder();
  const library = useMemo(
    () => new Map((exercises ?? []).map((e: Exercise) => [e.id, e])),
    [exercises],
  );

  const [menuFor, setMenuFor] = useState<RoutineListItem | null>(null);
  const [moving, setMoving] = useState<RoutineListItem | null>(null);
  const [folderMenu, setFolderMenu] = useState<RoutineFolder | null>(null);
  const [naming, setNaming] = useState<{ folder: RoutineFolder | null } | null>(null);

  const onAction = (action: RoutineAction, routine: RoutineListItem) => {
    if (action === 'duplicate') void actions.duplicate(routine);
    if (action === 'move') setMoving(routine);
    if (action === 'archive') actions.setArchived(routine, !routine.archived);
    if (action === 'delete') actions.delete(routine);
  };

  const nameFolder = (name: string) => {
    const folder = naming?.folder;
    saveFolder.mutate(
      folder
        ? { ...folder, name, updatedAt: new Date().toISOString() }
        : {
            id: randomUUID(),
            name,
            sortOrder: folders.length,
            updatedAt: new Date().toISOString(),
          },
    );
  };
  const confirmDeleteFolder = (folder: RoutineFolder) =>
    Alert.alert(`Delete “${folder.name}”?`, 'Its routines stay, without a folder.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFolder.mutate(folder.id) },
    ]);

  const header = (
    <View className="gap-lg pb-sm">
      <PlanCard />
      <SectionHeader title="New workout" />
      <StartOptions />
      <View className="flex-row items-center gap-xs pt-sm">
        <Text variant="subheading" className="flex-1">
          Routines
        </Text>
        {total > 1 ? (
          <IconButton
            icon="swap-vertical"
            size="sm"
            accessibilityLabel="Reorder routines and folders"
            onPress={() => router.push('/routines/reorder')}
          />
        ) : null}
        <Button
          label="New folder"
          variant="ghost"
          size="sm"
          onPress={() => setNaming({ folder: null })}
        />
        <Button
          label="New routine"
          icon="add"
          variant="ghost"
          size="sm"
          onPress={() => router.push('/routine/new')}
        />
      </View>
      {total > 0 ? (
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search routines or exercises"
        />
      ) : null}
      {loading ? <Skeleton height={96} /> : null}
    </View>
  );

  const footer = (
    <View className="gap-lg pt-md" style={{ paddingBottom: tabBarInset + 32 }}>
      {total > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Starter routines"
          onPress={() => router.push('/routines/templates')}
          className="min-h-12 flex-row items-center justify-center gap-sm rounded-lg border border-dashed border-border active:opacity-70"
        >
          <Icon name="sparkles-outline" size={16} tone="text" />
          <Text variant="label">Starter routines · add with one tap</Text>
        </Pressable>
      ) : null}
      <ListGroup>
        <ListItem
          title="Exercise library"
          subtitle={
            exercises?.length
              ? `${exercises.length} exercises · search works offline`
              : 'Search exercises or make your own'
          }
          leading={<Icon name="library-outline" size={22} tone="textMuted" />}
          onPress={() => router.push('/exercises')}
        />
      </ListGroup>
    </View>
  );

  const renderItem = ({ item }: { item: HubItem }) => {
    switch (item.type) {
      case 'folder':
        return <FolderHeader folder={item.folder} count={item.count} onMenu={setFolderMenu} />;
      case 'routine':
        return (
          <RoutineRow
            routine={item.routine}
            library={library}
            onAction={onAction}
            onMenu={setMenuFor}
          />
        );
      case 'archived':
        return (
          <ArchivedToggle
            count={item.count}
            open={item.open}
            onToggle={() => setShowArchived((o) => !o)}
          />
        );
      case 'empty':
        return <RoutinesEmpty searching={item.searching} />;
    }
  };

  return (
    <Screen
      title="Workout"
      bleedBottom
      headerRight={
        <IconButton
          icon="time-outline"
          accessibilityLabel="Workout history"
          variant="surface"
          onPress={() => router.push('/workouts')}
        />
      }
    >
      <FlashList
        data={loading ? [] : items}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        renderItem={renderItem}
        extraData={library}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarInset }}
      />

      <RoutineActionsSheet routine={menuFor} onAction={onAction} onClose={() => setMenuFor(null)} />
      <FolderPickerSheet
        visible={!!moving}
        current={moving?.folderId ?? null}
        onPick={(folderId) => moving && actions.move(moving, folderId)}
        onClose={() => setMoving(null)}
      />
      <FolderActionsSheet
        folder={folderMenu}
        onRename={(folder) => setNaming({ folder })}
        onDelete={confirmDeleteFolder}
        onClose={() => setFolderMenu(null)}
      />
      <FolderNameSheet
        visible={!!naming}
        folder={naming?.folder ?? null}
        onSave={nameFolder}
        onClose={() => setNaming(null)}
      />
    </Screen>
  );
}

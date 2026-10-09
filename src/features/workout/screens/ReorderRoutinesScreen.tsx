import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyState, Icon, ReorderList, Screen, SectionHeader, Text } from '@/components';
import {
  usePatchRoutines,
  useReorderFolders,
  useRoutineFolders,
  useRoutineList,
  type RoutineFolder,
  type RoutineListItem,
} from '@/lib/routines';
import type { RoutinePatch } from '@/lib/routines/repository';

const ROW = 56;

type Row =
  | { kind: 'header'; key: string; folder: RoutineFolder | null }
  | { kind: 'routine'; key: string; routine: RoutineListItem };

const byOrder = (a: RoutineListItem, b: RoutineListItem) =>
  a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt);

function buildRows(routines: RoutineListItem[], folders: RoutineFolder[]): Row[] {
  // Plan routines aren't in the routine list.
  const active = routines.filter((r) => !r.archived && r.source !== 'plan').sort(byOrder);
  const ids = new Set(folders.map((f) => f.id));
  const rows: Row[] = [{ kind: 'header', key: 'h:none', folder: null }];
  for (const r of active.filter((x) => !x.folderId || !ids.has(x.folderId))) {
    rows.push({ kind: 'routine', key: r.id, routine: r });
  }
  for (const f of folders) {
    rows.push({ kind: 'header', key: `h:${f.id}`, folder: f });
    for (const r of active.filter((x) => x.folderId === f.id)) {
      rows.push({ kind: 'routine', key: r.id, routine: r });
    }
  }
  return rows;
}

/** Each routine takes the folder of the header above it and its place under that header. */
function patchesFor(rows: Row[]): { id: string; patch: RoutinePatch }[] {
  const out: { id: string; patch: RoutinePatch }[] = [];
  let folderId: string | null = null;
  let order = 0;
  for (const row of rows) {
    if (row.kind === 'header') {
      folderId = row.folder?.id ?? null;
      order = 0;
      continue;
    }
    const r = row.routine;
    if (r.folderId !== folderId || r.sortOrder !== order) {
      out.push({ id: r.id, patch: { folderId, sortOrder: order } });
    }
    order++;
  }
  return out;
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** Drag routines into order, and across folder headers to move them between folders. */
export function ReorderRoutinesScreen() {
  const router = useRouter();
  const { data: routines } = useRoutineList();
  const { data: folders } = useRoutineFolders();
  const patch = usePatchRoutines();
  const reorderFolders = useReorderFolders();
  // A drop shows straight away; the override clears once the saved data comes back (or a sync
  // brings new routines or folders), so the list never snaps back or goes stale.
  const [override, setOverride] = useState<{
    rows: Row[];
    folders: RoutineFolder[];
    source: unknown[];
  } | null>(null);
  const source = [routines, folders];
  const current = override && override.source.every((x, i) => x === source[i]) ? override : null;
  const folderOrder = current?.folders ?? folders ?? null;
  const rows = current?.rows ?? (routines && folders ? buildRows(routines, folders) : null);

  const onRoutineMove = (from: number, to: number) => {
    if (!rows || !folderOrder) return;
    const next = move(rows, from, to);
    setOverride({ rows: next, folders: folderOrder, source });
    patch.mutate(patchesFor(next));
  };
  const onFolderMove = (from: number, to: number) => {
    if (!folderOrder || !routines) return;
    const next = move(folderOrder, from, to);
    setOverride({ rows: buildRows(routines, next), folders: next, source });
    reorderFolders.mutate(next.map((f) => f.id));
  };

  const routineCount = rows?.filter((r) => r.kind === 'routine').length ?? 0;

  return (
    <Screen title="Reorder routines" onBack={() => router.back()} edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="gap-lg pb-xxl">
        {folderOrder && folderOrder.length > 1 ? (
          <View className="gap-sm">
            <SectionHeader title="Folders" />
            <ReorderList
              data={folderOrder}
              keyExtractor={(f) => f.id}
              rowHeight={ROW}
              itemLabel={(f) => `${f.name} folder`}
              onReorder={onFolderMove}
              renderItem={(f) => (
                <View className="mr-xs h-12 flex-row items-center gap-sm rounded-md bg-surface px-lg">
                  <Icon name="folder-outline" size={18} tone="textMuted" />
                  <Text variant="subheading" numberOfLines={1}>
                    {f.name}
                  </Text>
                </View>
              )}
            />
          </View>
        ) : null}
        <View className="gap-sm">
          <SectionHeader title="Routines" meta="Drag across a folder to move it there" />
          {rows && routineCount > 0 ? (
            <ReorderList
              data={rows}
              keyExtractor={(r) => r.key}
              rowHeight={ROW}
              minIndex={1}
              isDraggable={(r) => r.kind === 'routine'}
              itemLabel={(r) =>
                r.kind === 'header' ? `Folder ${r.folder?.name ?? 'No folder'}` : r.routine.name
              }
              onReorder={onRoutineMove}
              renderItem={(r) =>
                r.kind === 'header' ? (
                  <View className="h-12 flex-row items-end gap-sm pb-xs">
                    <Icon
                      name={r.folder ? 'folder-outline' : 'albums-outline'}
                      size={16}
                      tone="textMuted"
                    />
                    <Text variant="label" tone="muted">
                      {r.folder?.name ?? 'No folder'}
                    </Text>
                  </View>
                ) : (
                  <View className="mr-xs h-12 justify-center rounded-md border-t border-edge bg-surface px-lg">
                    <Text variant="subheading" numberOfLines={1}>
                      {r.routine.name}
                    </Text>
                  </View>
                )
              }
            />
          ) : rows ? (
            <EmptyState icon="barbell-outline" title="No routines to reorder" />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

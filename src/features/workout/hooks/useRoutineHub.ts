import { useMemo } from 'react';

import { normaliseText, useExercises } from '@/lib/exercises';
import {
  useRoutineFolders,
  useRoutineList,
  type RoutineFolder,
  type RoutineListItem,
} from '@/lib/routines';

/** Rows of the Routines section, flattened for one FlashList. */
export type HubItem =
  | { type: 'folder'; key: string; folder: RoutineFolder | null; count: number }
  | { type: 'routine'; key: string; routine: RoutineListItem }
  | { type: 'archived'; key: string; count: number; open: boolean }
  | { type: 'empty'; key: string; searching: boolean };

const byOrder = (a: RoutineListItem, b: RoutineListItem) =>
  a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt);

/**
 * Groups routines by folder (folders in their order, "No folder" first), or lists matches when
 * searching (by routine name or any exercise in it). Hidden ids are routines waiting out an Undo.
 */
export function useRoutineHub(query: string, showArchived: boolean, hidden: ReadonlySet<string>) {
  const { data: list, isPending } = useRoutineList();
  const { data: folders = [] } = useRoutineFolders();
  const { data: library } = useExercises();

  const items = useMemo<HubItem[]>(() => {
    // Plan routines live with their plan (Workout → My Plan), not in the routine list.
    const visible = (list ?? []).filter((r) => !hidden.has(r.id) && r.source !== 'plan');
    const active = visible.filter((r) => !r.archived).sort(byOrder);
    const archived = visible.filter((r) => r.archived).sort(byOrder);
    const out: HubItem[] = [];
    const q = normaliseText(query);

    if (q) {
      const names = new Map((library ?? []).map((e) => [e.id, normaliseText(e.name)]));
      const matches = [...active, ...archived].filter(
        (r) =>
          normaliseText(r.name).includes(q) ||
          r.exercises.some((e) => names.get(e.exerciseId)?.includes(q)),
      );
      for (const r of matches) out.push({ type: 'routine', key: r.id, routine: r });
      if (!matches.length) out.push({ type: 'empty', key: 'empty', searching: true });
      return out;
    }

    if (!active.length && !archived.length) {
      return [{ type: 'empty', key: 'empty', searching: false }];
    }
    const folderIds = new Set(folders.map((f) => f.id));
    const loose = active.filter((r) => !r.folderId || !folderIds.has(r.folderId));
    if (folders.length && loose.length) {
      out.push({ type: 'folder', key: 'folder:none', folder: null, count: loose.length });
    }
    for (const r of loose) out.push({ type: 'routine', key: r.id, routine: r });
    for (const f of folders) {
      const inFolder = active.filter((r) => r.folderId === f.id);
      out.push({ type: 'folder', key: `folder:${f.id}`, folder: f, count: inFolder.length });
      for (const r of inFolder) out.push({ type: 'routine', key: r.id, routine: r });
    }
    if (archived.length) {
      out.push({ type: 'archived', key: 'archived', count: archived.length, open: showArchived });
      if (showArchived) {
        for (const r of archived) out.push({ type: 'routine', key: r.id, routine: r });
      }
    }
    return out;
  }, [list, folders, library, query, showArchived, hidden]);

  const total = list?.filter((r) => r.source !== 'plan').length ?? 0;
  return { items, loading: isPending, total };
}

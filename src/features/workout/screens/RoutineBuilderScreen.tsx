import { FlashList } from '@shopify/flash-list';
import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useMemo, useState } from 'react';
import { Alert, Keyboard, ScrollView, View } from 'react-native';

import { Button, EmptyState, IconButton, Screen, showToast, Skeleton } from '@/components';
import { useExercisePicker } from '@/lib/exercises';
import { summariseRoutine, supersetPositions, useDeleteRoutine } from '@/lib/routines';

import { FolderPickerSheet } from '../components/FolderPickerSheet';
import { addExercises, replaceExercise, updateMeta } from '../editor/actions';
import { AddExerciseButton } from '../editor/components/AddExerciseButton';
import { ExerciseCard } from '../editor/components/ExerciseCard';
import { ExerciseMenuSheet } from '../editor/components/ExerciseMenuSheet';
import { ReorderExercises } from '../editor/components/ReorderExercises';
import { RestSheet } from '../editor/components/RestSheet';
import { RoutineMenuSheet } from '../editor/components/RoutineMenuSheet';
import { RoutineMetaHeader } from '../editor/components/RoutineMetaHeader';
import { SelectionBar } from '../editor/components/SelectionBar';
import { SetSheet } from '../editor/components/SetSheet';
import { MuscleSheet, SummaryFooter } from '../editor/components/SummaryFooter';
import { UnsavedSheet } from '../editor/components/UnsavedSheet';
import { EditorEnvProvider } from '../editor/EditorEnv';
import { editRoutine, selectCanUndo, selectDirty, useRoutineEditor } from '../editor/store';
import { useEditorSession } from '../editor/useEditorSession';

type LeaveAction = Parameters<Parameters<typeof usePreventRemove>[1]>[0]['data']['action'];

/** Lets a focused cell commit (on blur) before reading the document. */
const settleInputs = () => {
  Keyboard.dismiss();
  return new Promise((resolve) => setTimeout(resolve, 60));
};

/** Routine editor: build a routine exercise by exercise, set by set. Saves locally, syncs later. */
export function RoutineBuilderScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useEditorSession(id);
  const { env } = session;
  const doc = useRoutineEditor((s) => s.doc);
  const mode = useRoutineEditor((s) => s.mode);
  const selected = useRoutineEditor((s) => s.selected);
  const sheet = useRoutineEditor((s) => s.sheet);
  const dirty = useRoutineEditor(selectDirty);
  const canUndo = useRoutineEditor(selectCanUndo);
  const pick = useExercisePicker();
  const deleteRoutine = useDeleteRoutine();
  const [leaving, setLeaving] = useState<LeaveAction | null>(null);

  usePreventRemove(dirty, ({ data }) => setLeaving(data.action));

  const summary = useMemo(
    () => (doc ? summariseRoutine(doc.exercises, (x) => env.exercises.get(x)) : null),
    [doc, env.exercises],
  );
  const positions = useMemo(() => (doc ? supersetPositions(doc.exercises) : []), [doc]);

  const add = async () => {
    const picked = await pick({ multiple: true });
    if (picked.length)
      editRoutine((d) => addExercises(d, picked, randomUUID, env.effort, env.defaultRestSec));
  };
  const replace = async (exerciseId: string) => {
    const current = doc?.exercises.find((e) => e.id === exerciseId);
    const from = current && env.exercises.get(current.exerciseId);
    const [next] = await pick({ multiple: false });
    if (next && from) {
      editRoutine((d) => replaceExercise(d, exerciseId, next, from.logType, env.effort));
    }
  };

  const save = async (then: () => void) => {
    await settleInputs();
    const result = await session.save();
    if (!result.ok) {
      setLeaving(null);
      showToast({ message: result.message, above: 'footer' });
      return;
    }
    // Navigate once the screen has re-rendered without unsaved changes.
    setTimeout(then, 0);
  };
  const leave = (action: LeaveAction | null) => () =>
    action ? navigation.dispatch(action) : router.back();

  const confirmDelete = () =>
    Alert.alert('Delete this routine?', 'It’s removed from all your devices.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const { baseline, markSaved } = useRoutineEditor.getState();
          if (baseline) markSaved(baseline);
          deleteRoutine.mutate(session.id);
          setTimeout(() => router.back(), 0);
        },
      },
    ]);

  const headerRight =
    mode === 'reorder' ? (
      <Button label="Done" size="sm" onPress={() => useRoutineEditor.getState().setMode('edit')} />
    ) : (
      <View className="flex-row items-center gap-xs">
        <IconButton
          icon="arrow-undo"
          accessibilityLabel="Undo"
          size="sm"
          disabled={!canUndo}
          onPress={() => useRoutineEditor.getState().undo()}
        />
        <IconButton
          icon="ellipsis-horizontal"
          accessibilityLabel="Routine options"
          size="sm"
          onPress={() => useRoutineEditor.getState().openSheet({ kind: 'routineMenu' })}
        />
        <Button
          label="Save"
          size="sm"
          loading={session.saving}
          onPress={() => void save(leave(null))}
        />
      </View>
    );

  const footer =
    mode === 'select' ? (
      <SelectionBar />
    ) : mode === 'edit' && summary ? (
      <SummaryFooter summary={summary} />
    ) : undefined;

  return (
    <EditorEnvProvider value={env}>
      <Screen
        title={session.isNew || session.draftOnly ? 'New routine' : 'Edit routine'}
        onBack={() => router.back()}
        headerRight={doc && !session.notFound ? headerRight : undefined}
        edges={['top', 'bottom']}
        footer={session.notFound ? undefined : footer}
        avoidKeyboard
      >
        {!doc ? (
          <View className="gap-md">
            <Skeleton height={56} />
            <Skeleton height={220} />
            <Skeleton height={220} />
          </View>
        ) : session.notFound ? (
          <EmptyState
            icon="trash-outline"
            title="Routine not found"
            description="It may have been deleted on another device."
            action={{ label: 'Back to routines', onPress: () => router.back() }}
          />
        ) : mode === 'reorder' ? (
          <ScrollView contentContainerClassName="pb-xxl">
            <ReorderExercises doc={doc} />
          </ScrollView>
        ) : (
          <FlashList
            data={doc.exercises}
            keyExtractor={(e) => e.id}
            getItemType={(_, i) => (positions[i] ? 'superset' : 'single')}
            extraData={selected}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <RoutineMetaHeader
                doc={doc}
                restored={session.restored}
                onDiscard={() => void session.discard()}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="barbell-outline"
                title="No exercises yet"
                description="Add a few from the library. You can pick several at once."
                action={{ label: 'Add exercises', onPress: () => void add() }}
              />
            }
            ListFooterComponent={
              doc.exercises.length ? <AddExerciseButton onPress={() => void add()} /> : null
            }
            renderItem={({ item, index }) => (
              <ExerciseCard
                exercise={item}
                superset={positions[index] ?? null}
                selecting={mode === 'select'}
                selected={selected.includes(item.id)}
              />
            )}
          />
        )}
      </Screen>

      <SetSheet />
      <RestSheet />
      <ExerciseMenuSheet onReplace={(x) => void replace(x)} />
      {summary ? <MuscleSheet summary={summary} /> : null}
      <RoutineMenuSheet canDelete={!session.isNew} onDelete={confirmDelete} />
      <FolderPickerSheet
        visible={sheet?.kind === 'folder'}
        current={doc?.folderId ?? null}
        title="Folder"
        onPick={(folderId) => editRoutine((d) => updateMeta(d, { folderId }))}
        onClose={() => useRoutineEditor.getState().openSheet(null)}
      />
      <UnsavedSheet
        visible={!!leaving}
        saving={session.saving}
        onSave={() => void save(leave(leaving))}
        onDiscard={() => void session.discard().then(() => setTimeout(leave(leaving), 0))}
        onKeepEditing={() => setLeaving(null)}
      />
    </EditorEnvProvider>
  );
}

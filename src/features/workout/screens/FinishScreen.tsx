import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import {
  Button,
  IconButton,
  Input,
  ListGroup,
  ListItem,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
} from '@/components';
import { useExercises, useRecordExerciseUse } from '@/lib/exercises';
import { haptics } from '@/lib/haptics';
import { useUserId } from '@/lib/auth';
import { readCachedBodyweight, useProfile } from '@/lib/profile';
import { estimateDurationMin, useRoutineDoc, useSaveRoutine } from '@/lib/routines';
import { useTheme } from '@/theme';
import {
  deleteLocalPhoto,
  hasDeviated,
  routineFromWorkout,
  summariseWorkout,
  useDiscardWorkout,
  useFinishWorkout,
  visibilityLabels,
  workoutVisibilities,
  WORKOUT_LIMITS,
  type WorkoutVisibility,
} from '@/lib/workouts';

import { EffortPicker } from '../finish/EffortPicker';
import { MusclesWorked } from '../finish/MusclesWorked';
import { PhotoField } from '../finish/PhotoField';
import { WorkoutStats } from '../finish/WorkoutStats';
import { dropOpenSets, openSetCount } from '../session/actions';
import { cancelPendingSave, skipRest } from '../session/controller';
import { activeSession, useSession } from '../session/store';

const visibilityOptions = workoutVisibilities.map((v) => ({
  value: v,
  label: visibilityLabels[v],
}));

/** The summary after Finish: what you did, how it felt, who sees it, then save or discard. */
export function FinishScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const userId = useUserId();
  // A workout started before any weigh-in was cached picks one up now (calorie estimate).
  const sessionDoc = useSession((s) => s.doc);
  const doc = useMemo(
    () =>
      sessionDoc && sessionDoc.bodyweightKg === null && userId
        ? { ...sessionDoc, bodyweightKg: readCachedBodyweight(userId) }
        : sessionDoc,
    [sessionDoc, userId],
  );
  const [endedAt] = useState(() => new Date().toISOString());
  const [notes, setNotes] = useState('');
  const [effort, setEffort] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<WorkoutVisibility | null>(null);
  const [updateRoutine, setUpdateRoutine] = useState(false);
  const { data: library } = useExercises();
  const { data: profile } = useProfile();
  const { data: routine } = useRoutineDoc(doc?.routineId ?? undefined);
  const finish = useFinishWorkout();
  const discard = useDiscardWorkout();
  const saveRoutine = useSaveRoutine();
  const recordUse = useRecordExerciseUse();
  const unit = profile?.units ?? 'kg';

  const kept = useMemo(() => (doc ? dropOpenSets({ ...doc, endedAt }) : null), [doc, endedAt]);
  const summary = useMemo(() => {
    const byId = new Map((library ?? []).map((e) => [e.id, e]));
    return kept ? summariseWorkout(kept, (id) => byId.get(id)) : null;
  }, [kept, library]);
  const deviated = !!routine && !!kept && hasDeviated(routine, kept);

  if (!doc || !kept || !summary) {
    return (
      <Screen onBack={() => router.back()} edges={['top', 'bottom']}>
        <Text tone="muted">This workout was already saved or discarded.</Text>
      </Screen>
    );
  }

  const dropped = openSetCount(doc);
  const nothingLogged = summary.sets === 0 && kept.exercises.length === 0;

  const save = async () => {
    await cancelPendingSave();
    skipRest(activeSession);
    const final = {
      ...kept,
      notes: notes.trim() || null,
      perceivedEffort: effort,
      visibility: visibility ?? doc.visibility,
      // The server computes these too; storing the preview means History has them offline.
      durationSec: summary.durationSec,
      caloriesEst: summary.calories,
    };
    await finish.mutateAsync({ doc: final, photoUri });
    if (updateRoutine && routine) {
      const next = routineFromWorkout(routine, final, randomUUID, new Date().toISOString());
      saveRoutine.mutate({ ...next, estimatedDurationMin: estimateDurationMin(next.exercises) });
    }
    recordUse.mutate([...new Set(final.exercises.map((e) => e.exerciseId))]);
    activeSession.getState().reset();
    haptics.success();
    // The server scores it as it syncs; the rewards screen waits for that.
    router.replace({ pathname: '/session/rewards', params: { id: final.id } });
  };

  const confirmDiscard = () =>
    Alert.alert('Discard this workout?', 'Everything you logged in it will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () =>
          void (async () => {
            await cancelPendingSave();
            skipRest(activeSession);
            deleteLocalPhoto(photoUri);
            await discard.mutateAsync(doc.id);
            activeSession.getState().reset();
            router.dismissAll();
          })(),
      },
    ]);

  return (
    <Screen
      title={doc.name}
      subtitle="Workout summary"
      onBack={() => router.back()}
      headerRight={
        <IconButton
          icon="trash-outline"
          accessibilityLabel="Discard workout"
          onPress={confirmDiscard}
        />
      }
      edges={['top', 'bottom']}
      scroll
      avoidKeyboard
      footer={
        <Button
          label="Save workout"
          fullWidth
          loading={finish.isPending}
          disabled={nothingLogged}
          onPress={() => void save()}
        />
      }
    >
      <View className="gap-xl">
        <WorkoutStats
          summary={summary}
          unit={unit}
          showBodyweightHint={doc.bodyweightKg === null}
        />
        {nothingLogged ? (
          <Text variant="body" tone="warning">
            No sets are ticked yet. Go back to log some, or discard this workout.
          </Text>
        ) : dropped > 0 ? (
          <Text variant="caption" tone="muted">
            {dropped} unticked {dropped === 1 ? 'set' : 'sets'} won’t be saved.
          </Text>
        ) : null}
        <View className="gap-sm">
          <SectionHeader title="Muscles worked" />
          <MusclesWorked muscles={summary.muscles} />
        </View>
        <EffortPicker value={effort} onChange={setEffort} />
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={WORKOUT_LIMITS.notesMax}
          placeholder="Felt strong. Left knee a bit tight."
          autoCapitalize="sentences"
          autoComplete="off"
          textContentType="none"
        />
        <PhotoField workoutId={doc.id} uri={photoUri} onChange={setPhotoUri} />
        <View className="gap-sm">
          <Text variant="subheading">Who can see it</Text>
          <SegmentedControl
            options={visibilityOptions}
            value={visibility ?? doc.visibility}
            onChange={setVisibility}
            accessibilityLabel="Who can see this workout"
          />
          <Text variant="caption" tone="muted">
            {(visibility ?? doc.visibility) === 'private'
              ? 'Only you. It won’t be posted.'
              : (visibility ?? doc.visibility) === 'public'
                ? 'Posted to your feed. Anyone can see it, unless your profile is more private.'
                : 'Posted to your friends’ feeds. Notes stay private either way.'}
          </Text>
        </View>
        {deviated ? (
          <ListGroup>
            <ListItem
              title="Update routine with these changes"
              subtitle={`Saves today’s exercises, sets and weights to “${routine?.name}”`}
              trailing={
                <Switch
                  value={updateRoutine}
                  onValueChange={setUpdateRoutine}
                  accessibilityLabel="Update routine with these changes"
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.text}
                />
              }
            />
          </ListGroup>
        ) : null}
      </View>
    </Screen>
  );
}

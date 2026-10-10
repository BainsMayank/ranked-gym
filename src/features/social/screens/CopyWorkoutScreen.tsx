import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  EmptyState,
  IconButton,
  Input,
  ListGroup,
  ListItem,
  Screen,
  SegmentedControl,
  Skeleton,
  Text,
  showToast,
} from '@/components';
import { formatSetCount, saveDraft, useSaveRoutine } from '@/lib/routines';
import { usePost } from '@/lib/social';
import { formatPrevious } from '@/lib/workouts/lastTime';
import { useProfile } from '@/lib/profile';

import { routineFromPost } from '../copyWorkout';
import { displayName } from '../format';

const WEIGHTS = [
  { value: 'keep', label: 'Keep their weights' },
  { value: 'blank', label: 'Leave blank' },
] as const;

/** Preview someone's workout as a routine of mine, rename it, then save or open the builder. */
export function CopyWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = usePost(id);
  const unit = useProfile().data?.units ?? 'kg';
  const save = useSaveRoutine();
  const [name, setName] = useState<string | null>(null);
  const [weights, setWeights] = useState<'keep' | 'blank'>('keep');
  const [routineId] = useState(() => randomUUID());

  const post = detail.data?.post;
  const built = useMemo(() => {
    if (!post || post.type !== 'workout' || !detail.data) return null;
    return routineFromPost(post, detail.data.exercises, {
      id: routineId,
      name: name ?? post.workout.name,
      keepWeights: weights === 'keep',
      // Official exercises and my own; someone else's custom exercises can't be copied.
      usable: (e) => !e.custom,
      newId: randomUUID,
      now: new Date().toISOString(),
    });
  }, [post, detail.data, routineId, name, weights]);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/home/feed'));
  const header = (
    <IconButton icon="close" variant="surface" accessibilityLabel="Close" onPress={close} />
  );

  if (detail.isLoading) {
    return (
      <Screen title="Copy workout" headerRight={header} scroll>
        <Skeleton height={240} radius="lg" />
      </Screen>
    );
  }
  if (!post || post.type !== 'workout' || !built) {
    return (
      <Screen title="Copy workout" headerRight={header} scroll>
        <EmptyState
          icon="eye-off-outline"
          title="This workout isn’t available"
          description="It may have been deleted, or it’s only visible to other people."
        />
      </Screen>
    );
  }

  const { doc, skipped } = built;
  const empty = doc.exercises.length === 0;
  const names = new Map(detail.data?.exercises.map((e) => [e.exerciseId, e.name]));
  const saveRoutine = () =>
    save.mutate(doc, {
      onSuccess: () => {
        showToast({
          message: `Saved “${doc.name}” to your routines`,
          actionLabel: 'Edit',
          onAction: () => router.push({ pathname: '/routine/[id]', params: { id: doc.id } }),
        });
        close();
      },
      onError: () => showToast({ message: 'That routine couldn’t be saved. Try again.' }),
    });
  const openBuilder = async () => {
    await saveDraft(doc);
    router.replace({ pathname: '/routine/[id]', params: { id: doc.id } });
  };

  return (
    <Screen
      title="Copy workout"
      subtitle={`From ${displayName(post.author)}`}
      headerRight={header}
      scroll
      avoidKeyboard
      footer={
        <View className="gap-sm">
          <Button
            label="Save routine"
            onPress={saveRoutine}
            disabled={empty}
            loading={save.isPending}
            fullWidth
          />
          <Button
            label="Edit in builder first"
            variant="outline"
            onPress={() => void openBuilder()}
            disabled={empty}
            fullWidth
          />
        </View>
      }
    >
      <View className="gap-lg">
        <Input
          label="Routine name"
          value={name ?? post.workout.name}
          onChangeText={setName}
          maxLength={60}
          autoCapitalize="sentences"
          autoComplete="off"
        />
        <View className="gap-xs">
          <Text variant="label" tone="muted">
            Weights
          </Text>
          <SegmentedControl
            options={WEIGHTS}
            value={weights}
            onChange={setWeights}
            accessibilityLabel="Weights"
          />
        </View>
        <ListGroup>
          {doc.exercises.map((e) => (
            <ListItem
              key={e.id}
              title={names.get(e.exerciseId) ?? 'Exercise'}
              subtitle={e.sets
                .map((s) =>
                  formatPrevious(
                    {
                      setType: s.setType,
                      weightMode: s.weightMode,
                      reps: s.reps,
                      weightKg: s.weightKg,
                      durationSec: s.durationSec,
                      distanceM: s.distanceM,
                      rir: s.rir,
                      rpe: s.rpe,
                    },
                    unit,
                  ),
                )
                .filter(Boolean)
                .join(', ')}
              value={formatSetCount(e.sets.length)}
            />
          ))}
        </ListGroup>
        {skipped.length > 0 ? (
          <Text variant="caption" tone="muted">
            Left out: {skipped.map((e) => e.name).join(', ')} (their own custom{' '}
            {skipped.length === 1 ? 'exercise' : 'exercises'}).
          </Text>
        ) : null}
        <Text variant="caption" tone="muted">
          Saved as your own routine. You can change anything later; it shows “Copied from{' '}
          {post.author.username ? `@${post.author.username}` : displayName(post.author)}”.
        </Text>
      </View>
    </Screen>
  );
}

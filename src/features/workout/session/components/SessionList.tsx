import { randomUUID } from 'expo-crypto';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState, Text } from '@/components';
import { useExercisePicker } from '@/lib/exercises';
import { supersetPositions } from '@/lib/routines';

import { addExercises } from '../actions';
import { rowRefs } from '../rowRegistry';
import { useSessionEnv } from '../SessionEnv';
import { useSession, useSessionStore } from '../store';
import { LogExerciseCard } from './LogExerciseCard';

/** Room left under the list for the docked keypad, so the last rows can scroll above it. */
const KEYPAD_ROOM = 360;

/** The exercises being logged (a workout has 40 at most, so a plain ScrollView is fine). */
export function SessionList({ onDiscard }: { onDiscard?: () => void }) {
  const store = useSessionStore();
  const env = useSessionEnv();
  const scroll = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  const ids = useSession((s) => s.doc?.exercises.map((e) => e.id).join(',') ?? '');
  const groups = useSession(
    (s) => s.doc?.exercises.map((e) => e.supersetGroup ?? 0).join(',') ?? '',
  );
  const keypadSet = useSession((s) => s.keypad?.setId ?? null);
  const pick = useExercisePicker();
  const exerciseIds = ids ? ids.split(',') : [];
  const positions = supersetPositions(
    (groups ? groups.split(',') : []).map((g) => ({ supersetGroup: Number(g) || null })),
  );

  // Bring the row being typed into above the keypad.
  useEffect(() => {
    if (!keypadSet) return;
    const row = rowRefs.get(keypadSet);
    if (!row || !content.current) return;
    row.measureLayout(content.current, (_x, y) => {
      scroll.current?.scrollTo({ y: Math.max(0, y - 140), animated: true });
    });
  }, [keypadSet]);

  const add = async () => {
    const exclude = store.getState().doc?.exercises.map((e) => e.exerciseId) ?? [];
    const picked = await pick({ multiple: true, exclude });
    if (picked.length) {
      store
        .getState()
        .apply((d) => addExercises(d, picked, randomUUID, env.effort, env.defaultRestSec));
    }
  };

  return (
    <ScrollView
      ref={scroll}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: keypadSet ? KEYPAD_ROOM : 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View ref={content} collapsable={false} className="gap-xs px-lg pt-xs">
        {exerciseIds.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title="Add your first exercise"
            description="Pick from the library. Sets you tick are saved on this phone straight away."
          />
        ) : null}
        {exerciseIds.map((id, i) => (
          <LogExerciseCard key={id} exerciseId={id} superset={positions[i] ?? null} />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add exercise"
          onPress={() => void add()}
          className="min-h-12 flex-row items-center justify-center gap-sm rounded-lg border border-dashed border-border active:opacity-70"
        >
          <Text variant="subheading">+ Add exercise</Text>
        </Pressable>
        {onDiscard ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard workout"
            onPress={onDiscard}
            hitSlop={8}
            className="mt-lg min-h-11 items-center justify-center self-center px-lg active:opacity-70"
          >
            <Text variant="label" tone="danger">
              Discard workout
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

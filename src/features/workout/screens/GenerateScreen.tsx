import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Screen, showToast } from '@/components';
import { equipmentTypes, useExercises, type Muscle } from '@/lib/exercises';
import { useTrainingSettings } from '@/lib/profile';
import { blankRoutine, useSaveRoutine } from '@/lib/routines';
import {
  generateWorkout,
  newSeed,
  rerollExercise,
  useLastDone,
  useWorkoutPrefs,
  type GeneratedWorkout,
  type GeneratorOptions,
} from '@/lib/workouts';

import { GeneratedList } from '../generate/GeneratedList';
import { GeneratorOptionsForm } from '../generate/GeneratorOptionsForm';
import { useStartWorkout } from '../session/hooks/useStartWorkout';

type Preset = 'surprise' | 'full' | 'dumbbells';

/**
 * Generate a random workout: pick focus, time, equipment and intensity, and the session redraws
 * as you go (no Generate button). Swap any exercise, reroll the lot, then start it or keep it.
 */
export function GenerateScreen() {
  const router = useRouter();
  const { preset } = useLocalSearchParams<{ preset?: Preset }>();
  const prefs = useWorkoutPrefs();
  const settings = useTrainingSettings();
  const { data: library } = useExercises();
  const { data: lastDone } = useLastDone();
  const start = useStartWorkout();
  const saveRoutine = useSaveRoutine();

  const [options, setOptions] = useState<GeneratorOptions>(() => ({
    focus:
      preset === 'full'
        ? { kind: 'regions', regions: ['chest', 'back', 'legs', 'shoulders'] }
        : { kind: 'surprise' },
    minutes: preset === 'full' ? 45 : prefs.generator.minutes,
    equipment:
      preset === 'dumbbells'
        ? ['dumbbell']
        : (prefs.generator.equipment ?? equipmentTypes.filter((e) => e !== 'other')),
    intensity: prefs.generator.intensity,
    seed: newSeed(),
  }));

  const byId = useMemo(() => new Map((library ?? []).map((e) => [e.id, e])), [library]);
  // When each muscle was last trained, from the exercises done (for "Surprise me").
  const lastTrained = useMemo(() => {
    const out = new Map<Muscle, number>();
    for (const [exerciseId, at] of lastDone ?? []) {
      for (const m of byId.get(exerciseId)?.muscles ?? []) {
        if (m.role === 'stabiliser') continue;
        if (at > (out.get(m.muscle) ?? 0)) out.set(m.muscle, at);
      }
    }
    return out;
  }, [lastDone, byId]);

  const [now] = useState(() => Date.now());
  const ctx = useMemo(
    () => ({
      library: library ?? [],
      lastTrained,
      now,
      effort: settings.effort_metric,
      newId: randomUUID,
    }),
    [library, lastTrained, now, settings.effort_metric],
  );
  const generated = useMemo(() => generateWorkout(options, ctx), [options, ctx]);
  // Swaps apply on top of the current generation; any option change starts fresh.
  const [swapped, setSwapped] = useState<{ base: GeneratedWorkout; workout: GeneratedWorkout }>();
  const workout = swapped?.base === generated ? swapped.workout : generated;

  const change = (patch: Partial<GeneratorOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    prefs.update({
      generator: { minutes: next.minutes, equipment: next.equipment, intensity: next.intensity },
    });
  };

  const saveAsRoutine = () => {
    const now = new Date().toISOString();
    saveRoutine.mutate({
      ...blankRoutine(randomUUID(), now),
      name: workout.name,
      source: 'generated',
      estimatedDurationMin: workout.estimatedMin,
      exercises: workout.exercises,
    });
    showToast({ message: `Saved “${workout.name}” to your routines` });
  };

  return (
    <Screen
      title="Generate a workout"
      onBack={() => router.back()}
      edges={['top', 'bottom']}
      scroll
      footer={
        <View className="flex-row gap-sm">
          <Button
            label="Save as routine"
            variant="secondary"
            disabled={workout.exercises.length === 0}
            onPress={saveAsRoutine}
          />
          <Button
            label="Start workout"
            className="flex-1"
            disabled={workout.exercises.length === 0}
            onPress={() =>
              start({
                kind: 'plan',
                plan: { name: workout.name, routineId: null, exercises: workout.exercises },
              })
            }
          />
        </View>
      }
    >
      <View className="gap-xl">
        <GeneratorOptionsForm options={options} onChange={change} />
        <GeneratedList
          workout={workout}
          library={byId}
          onRerollAll={() => change({ seed: newSeed() })}
          onReroll={(i) =>
            setSwapped({
              base: generated,
              workout: rerollExercise(workout, i, options, ctx, newSeed()),
            })
          }
        />
      </View>
    </Screen>
  );
}

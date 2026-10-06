import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Chip, IconButton, Screen, SectionHeader, Text } from '@/components';

import { PlanCard } from '../components/PlanCard';
import { RoutineCard } from '../components/RoutineCard';
import { StartOptions } from '../components/StartOptions';
import { routines, type Routine } from '../mocks';

const FOLDERS = ['All', 'PPL', 'Upper / Lower', 'Home'] as const;
type Folder = (typeof FOLDERS)[number];

/** Workout tab: your plan, ways to start a session, and your routines. */
export function WorkoutScreen() {
  const [folder, setFolder] = useState<Folder>('All');
  const shown = routines.filter((r: Routine) => folder === 'All' || r.folder === folder);

  return (
    <Screen
      title="Workout"
      scroll
      headerRight={
        <IconButton icon="time-outline" accessibilityLabel="Workout history" variant="surface" />
      }
    >
      <View className="gap-lg">
        <PlanCard />

        <SectionHeader title="New workout" />
        <StartOptions />

        <View className="flex-row items-center justify-between">
          <Text variant="subheading">Routines</Text>
          <Button
            label="New routine"
            icon="add"
            variant="ghost"
            size="sm"
            onPress={() => undefined}
          />
        </View>
        <View className="flex-row flex-wrap gap-sm">
          {FOLDERS.map((f) => (
            <Chip
              key={f}
              label={f === 'All' ? `All ${routines.length}` : f}
              selected={f === folder}
              onPress={() => setFolder(f)}
            />
          ))}
        </View>
        <View className="gap-sm">
          {shown.map((r) => (
            <RoutineCard key={r.id} routine={r} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse routine library, 120 plus templates"
          onPress={() => undefined}
          className="min-h-12 items-center justify-center rounded-lg border border-dashed border-border active:opacity-70"
        >
          <Text variant="label">Browse routine library · 120+ templates</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

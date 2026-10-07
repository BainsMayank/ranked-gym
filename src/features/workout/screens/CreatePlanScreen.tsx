import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  OptionCard,
  Screen,
  SegmentedControl,
  SelectField,
  StepProgress,
  Text,
} from '@/components';
import { goalOptions, useProfile, type PrimaryGoal } from '@/lib/profile';

import { DayPicker } from '../components/DayPicker';

const SCHEDULE = [
  { value: 'count', label: 'Days per week' },
  { value: 'days', label: 'Specific days' },
] as const;

const LENGTHS = [
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '75', label: '75 min' },
  { value: '90', label: '90 min' },
] as const;

/** Plan generator, step 1: goal, schedule, session length and profile. Generation lands in Phase 5. */
export function CreatePlanScreen() {
  const router = useRouter();
  // Starts on the goal picked in onboarding.
  const { data: profile } = useProfile();
  const [goal, setGoal] = useState<PrimaryGoal>(profile?.primary_goal ?? goalOptions[0].id);
  const [schedule, setSchedule] = useState<(typeof SCHEDULE)[number]['value']>('days');
  const [days, setDays] = useState<number[]>([0, 2, 4, 5]);
  const [length, setLength] = useState<(typeof LENGTHS)[number]['value']>('60');
  const goalTitle = goalOptions.find((g) => g.id === goal)?.title ?? '';

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  return (
    <Screen
      title="Create plan"
      onBack={() => router.back()}
      headerRight={
        <Text variant="label" tone="muted">
          Step 1 of 3
        </Text>
      }
      edges={['top', 'bottom']}
      scroll
      footer={
        <View className="gap-sm">
          <Text variant="caption" tone="muted" className="text-center">
            {goalTitle} · {days.length} days / week · suggested split: Upper / Lower
          </Text>
          <Button label="Generate my plan" fullWidth onPress={() => router.back()} />
        </View>
      }
    >
      <View className="gap-lg">
        <StepProgress step={1} total={3} />
        <Text variant="title">What do you want to achieve?</Text>
        <View className="flex-row flex-wrap gap-sm">
          {goalOptions.map((g) => (
            <OptionCard
              key={g.id}
              title={g.title}
              subtitle={g.subtitle}
              selected={g.id === goal}
              onPress={() => setGoal(g.id)}
            />
          ))}
        </View>

        <Text variant="subheading">When can you train?</Text>
        <SegmentedControl
          accessibilityLabel="Schedule type"
          options={SCHEDULE}
          value={schedule}
          onChange={setSchedule}
        />
        <DayPicker selected={days} onToggle={toggleDay} />
        <Text variant="caption" tone="muted">
          {days.length} days selected · we&apos;ll balance recovery between them
        </Text>

        <Text variant="subheading">Session length</Text>
        <SegmentedControl
          accessibilityLabel="Session length"
          options={LENGTHS}
          value={length}
          onChange={setLength}
        />

        <View className="flex-row gap-sm">
          <SelectField label="Experience" value="Intermediate" onPress={() => undefined} />
          <SelectField label="Equipment" value="Full gym" onPress={() => undefined} />
        </View>
        <View className="flex-row gap-sm">
          <SelectField label="Plan length" value="8 weeks" onPress={() => undefined} />
          <SelectField label="Weak points" value="Hamstrings" onPress={() => undefined} />
        </View>
      </View>
    </Screen>
  );
}

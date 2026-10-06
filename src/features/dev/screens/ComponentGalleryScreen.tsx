import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Input,
  NumberStepper,
  ProgressBar,
  Screen,
  SegmentedControl,
  Sheet,
  Skeleton,
  Text,
  TopTabs,
} from '@/components';
import {
  colorTokenNames,
  rankColors,
  rankTiers,
  useTheme,
  useThemeStore,
  type ThemeMode,
} from '@/theme';

import { GameSection } from '../components/GameSection';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-md">
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );
}

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
] as const satisfies readonly { value: ThemeMode; label: string }[];

const RANGE_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
] as const;

const DEMO_TABS = [
  { key: 'ranks', label: 'My Ranks' },
  { key: 'body', label: 'Body Map' },
  { key: 'leagues', label: 'Leagues' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'records', label: 'Records' },
] as const;

const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const;

/** Dev-only gallery of every base component. Route: /dev/components. */
export function ComponentGalleryScreen() {
  const { colors } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState(60);
  const [reps, setReps] = useState(8);
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]['value']>('7');
  const [tab, setTab] = useState<string>('ranks');
  const [muscles, setMuscles] = useState<string[]>(['Chest']);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');

  const toggleMuscle = (m: string) =>
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <Screen edges={[]} scroll className="gap-xxl pt-lg">
      <Section title="Theme">
        <SegmentedControl
          accessibilityLabel="Theme"
          options={THEME_OPTIONS}
          value={mode}
          onChange={setMode}
        />
        <View className="flex-row flex-wrap gap-sm">
          {colorTokenNames.map((t) => (
            <View key={t} className="w-24 gap-xs">
              <View
                className="h-10 rounded-sm border border-border"
                style={{ backgroundColor: colors[t] }}
              />
              <Text variant="caption" tone="muted">
                {t}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Text">
        <Text variant="hero">Hero</Text>
        <Text variant="display" numeric>
          142.5 kg
        </Text>
        <Text variant="title">Title</Text>
        <Text variant="heading">Heading</Text>
        <Text variant="subheading">Subheading</Text>
        <Text>Body — the quick brown fox lifts the lazy dog.</Text>
        <Text variant="label">Label</Text>
        <Text variant="caption" tone="muted">
          Caption, muted
        </Text>
        <Text variant="overline" tone="muted">
          Overline · Tuesday, 6 October
        </Text>
        <View className="flex-row flex-wrap gap-md">
          <Text tone="primary">primary</Text>
          <Text tone="success">success</Text>
          <Text tone="warning">warning</Text>
          <Text tone="streak">streak</Text>
          <Text tone="danger">danger</Text>
        </View>
      </Section>

      <Section title="Button">
        <Button label="Start workout" icon="play" onPress={() => undefined} />
        <Button label="Join challenge" variant="accent" onPress={() => undefined} />
        <Button label="Secondary" variant="secondary" onPress={() => undefined} />
        <Button label="Ghost" variant="ghost" onPress={() => undefined} />
        <Button
          label="Delete routine"
          variant="destructive"
          icon="trash-outline"
          onPress={() => undefined}
        />
        <Button label="Disabled" disabled onPress={() => undefined} />
        <Button
          label={loading ? 'Saving' : 'Tap to load'}
          loading={loading}
          onPress={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
        />
        <View className="flex-row gap-sm">
          <Button label="Small" size="sm" onPress={() => undefined} />
          <Button label="Large" size="lg" variant="secondary" onPress={() => undefined} />
        </View>
      </Section>

      <Section title="IconButton">
        <View className="flex-row gap-md">
          <IconButton icon="add" accessibilityLabel="Add" variant="primary" />
          <IconButton icon="search" accessibilityLabel="Search" variant="surface" />
          <IconButton icon="ellipsis-horizontal" accessibilityLabel="More options" />
          <IconButton
            icon="timer-outline"
            accessibilityLabel="Rest timer"
            size="lg"
            variant="surface"
          />
          <IconButton icon="close" accessibilityLabel="Close" size="sm" disabled />
        </View>
      </Section>

      <Section title="Card">
        <Card>
          <Text variant="subheading">Card</Text>
          <Text tone="muted">Surface with a lit top edge.</Text>
        </Card>
        <Card raised>
          <Text variant="subheading">Raised card</Text>
          <Text tone="muted">surfaceRaised + shadow.</Text>
        </Card>
        <Card onPress={() => undefined} accessibilityLabel="Pressable card">
          <Text variant="subheading">Pressable card</Text>
        </Card>
      </Section>

      <Section title="Chip">
        <View className="flex-row flex-wrap gap-sm">
          {MUSCLES.map((m) => (
            <Chip
              key={m}
              label={m}
              selected={muscles.includes(m)}
              onPress={() => toggleMuscle(m)}
            />
          ))}
          <Chip label="Static" icon="flame-outline" />
        </View>
      </Section>

      <Section title="Input">
        <Input label="Routine name" placeholder="Leg Day" value={name} onChangeText={setName} />
        <Input
          label="Bodyweight"
          placeholder="70"
          keyboardType="decimal-pad"
          helperText="In kilograms"
        />
        <Input label="Username" value="gym bro" error="Usernames can't contain spaces" />
      </Section>

      <Section title="NumberStepper">
        <NumberStepper label="Weight" value={weight} onChange={setWeight} step={2.5} unit="kg" />
        <NumberStepper label="Reps" value={reps} onChange={setReps} min={1} max={50} />
      </Section>

      <Section title="Sheet">
        <Button label="Open sheet" variant="secondary" onPress={() => setSheetOpen(true)} />
        <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Set type">
          <View className="gap-sm">
            {['Warm-up', 'Working', 'Top set', 'Back-off', 'Drop set', 'Failure'].map((t) => (
              <Button key={t} label={t} variant="secondary" onPress={() => setSheetOpen(false)} />
            ))}
          </View>
        </Sheet>
      </Section>

      <Section title="EmptyState">
        <Card padded={false}>
          <EmptyState
            icon="barbell-outline"
            title="No workouts yet"
            description="Log your first session to start ranking."
            action={{ label: 'Start workout', onPress: () => undefined }}
          />
        </Card>
      </Section>

      <Section title="Skeleton">
        <View className="flex-row items-center gap-md">
          <Skeleton width={44} height={44} radius="full" />
          <View className="flex-1 gap-sm">
            <Skeleton width="70%" />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      </Section>

      <GameSection />

      <Section title="ProgressBar">
        <ProgressBar progress={0.65} accessibilityLabel="Weekly volume goal" />
        <ProgressBar progress={0.9} tone="success" accessibilityLabel="Chest recovery" />
        <ProgressBar progress={0.35} tone="warning" accessibilityLabel="Leg recovery" />
        <ProgressBar progress={0.15} tone="danger" accessibilityLabel="Back recovery" />
        {rankTiers.map((tier) => (
          <View key={tier} className="flex-row items-center gap-md">
            <Text variant="caption" className="w-16" style={{ color: rankColors[tier].base }}>
              {tier}
            </Text>
            <ProgressBar
              progress={0.5}
              rankTier={tier}
              accessibilityLabel={`${tier} progress`}
              className="flex-1"
            />
          </View>
        ))}
      </Section>

      <Section title="SegmentedControl">
        <SegmentedControl
          accessibilityLabel="Time range"
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
        />
      </Section>

      <Section title="TopTabs">
        <View className="-mx-lg">
          <TopTabs tabs={DEMO_TABS} activeKey={tab} onChange={setTab} />
        </View>
      </Section>
    </Screen>
  );
}

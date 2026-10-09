import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Screen, SectionHeader, SegmentedControl, Skeleton, Text } from '@/components';
import {
  defaultStart,
  generatePlan,
  groupTargets,
  localDateKey,
  schedulePlan,
  useActivePlan,
  useCreatePlan,
  weekdayShort,
  type StartChoice,
} from '@/lib/plans';
import { estimateDurationMin } from '@/lib/routines';

import { SessionExercises } from '../plan/components/SessionExercises';
import { VolumeBars } from '../plan/components/VolumeBars';
import { WhyList } from '../plan/components/WhyList';
import { usePlanDraft } from '../plan/draft';
import { usePlanEngine } from '../plan/hooks/usePlanEngine';

const STARTS = [
  { value: 'this_week', label: 'This week' },
  { value: 'next_week', label: 'Next Monday' },
] as const;

/** The generated plan before it's saved: sessions, weekly volume, why, and when to start. */
export function PlanPreviewScreen() {
  const router = useRouter();
  const input = usePlanDraft((s) => s.input);
  const seed = usePlanDraft((s) => s.seed);
  const reroll = usePlanDraft((s) => s.reroll);
  const { ctx, ready } = usePlanEngine();
  const { data: active } = useActivePlan();
  const create = useCreatePlan();
  const [today] = useState(() => localDateKey(new Date()));

  const plan = useMemo(
    () => (ready ? generatePlan(input, ctx, { seed }) : null),
    [ready, input, ctx, seed],
  );
  const [start, setStart] = useState<StartChoice | null>(null);
  const names = useMemo(() => new Map(ctx.library.map((e) => [e.id, e.name])), [ctx.library]);
  const chosenStart = start ?? (plan ? defaultStart(plan, today) : 'this_week');

  const save = () => {
    if (!plan) return;
    const laid = schedulePlan(plan, { today, start: chosenStart, newId: ctx.newId });
    const routines = plan.sessions.flatMap((s) => (s.deload ? [s.routine, s.deload] : [s.routine]));
    create.mutate(
      {
        doc: {
          id: plan.id,
          name: plan.name,
          goal: plan.goal,
          settings: plan.settings,
          status: 'active',
          pausedAt: null,
          updatedAt: new Date().toISOString(),
          ...laid,
        },
        routines,
        today,
      },
      { onSuccess: () => router.dismissTo('/workout') },
    );
  };
  const confirm = () =>
    active
      ? Alert.alert(
          'End your current plan?',
          `“${active.name}” stops here; its workouts stay in your history.`,
          [
            { text: 'Keep it', style: 'cancel' },
            { text: 'Start the new plan', style: 'destructive', onPress: save },
          ],
        )
      : save();

  return (
    <Screen
      title="Your plan"
      onBack={() => router.back()}
      edges={['top', 'bottom']}
      scroll
      footer={
        <View className="gap-sm">
          <SegmentedControl
            accessibilityLabel="When to start"
            options={STARTS}
            value={chosenStart}
            onChange={setStart}
          />
          <View className="flex-row gap-sm">
            <Button label="Regenerate" variant="secondary" icon="shuffle" onPress={reroll} />
            <Button
              label="Start this plan"
              className="flex-1"
              loading={create.isPending}
              disabled={!plan}
              onPress={confirm}
            />
          </View>
        </View>
      }
    >
      {!plan ? (
        <Skeleton height={240} />
      ) : (
        <View className="gap-xl">
          <View className="gap-xs">
            <Text variant="title">{plan.name}</Text>
            <Text variant="body" tone="muted">
              {plan.splitLabel} · {input.weeks} weeks ·{' '}
              {plan.week.map((d) => weekdayShort[d.weekday]).join(', ')}
            </Text>
          </View>
          {plan.sessions.map((s) => (
            <View key={s.key} className="gap-sm">
              <SectionHeader
                title={s.label}
                meta={`~${estimateDurationMin(s.routine.exercises)} min`}
              />
              <SessionExercises exercises={s.routine.exercises} names={names} />
            </View>
          ))}
          <View className="gap-md">
            <SectionHeader title="Weekly sets per muscle" />
            <VolumeBars
              sets={Object.fromEntries(plan.volume.map((v) => [v.group, v.sets])) as never}
              targets={groupTargets(input)}
            />
          </View>
          <View className="gap-md">
            <SectionHeader title="Why this plan" />
            <WhyList sections={plan.explanation} />
          </View>
        </View>
      )}
    </Screen>
  );
}

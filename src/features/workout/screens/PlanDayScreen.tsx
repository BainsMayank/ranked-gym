import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, EmptyState, Screen, Skeleton, Tag, Text } from '@/components';
import { useExercisePicker } from '@/lib/exercises';
import {
  isDeloadDay,
  isOpen,
  localDateKey,
  swapCandidates,
  usePlanDay,
  type EditScope,
  type PlanExercise,
} from '@/lib/plans';
import { useRoutineDoc, type RoutineExercise } from '@/lib/routines';

import { MoveSheet } from '../plan/components/MoveSheet';
import { ScopeSheet } from '../plan/components/ScopeSheet';
import { SessionExercises } from '../plan/components/SessionExercises';
import { SwapSheet } from '../plan/components/SwapSheet';
import { formatPlanDate } from '../plan/format';
import { usePlanActions } from '../plan/hooks/usePlanActions';
import { usePlanEngine } from '../plan/hooks/usePlanEngine';
import { stateOf } from '../plan/view';
import { useStartWorkout } from '../session/hooks/useStartWorkout';

type Pending =
  { kind: 'swap'; from: PlanExercise; to: PlanExercise } | { kind: 'regenerate' } | null;

/** One planned session: its exercises, Start, and the edits (swap, move, regenerate, skip). */
export function PlanDayScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: found, isPending } = usePlanDay(id);
  const { data: routine } = useRoutineDoc(found?.day.routineId ?? undefined);
  const { ctx } = usePlanEngine();
  const actions = usePlanActions();
  const start = useStartWorkout();
  const pickExercise = useExercisePicker();
  const [today] = useState(() => localDateKey(new Date()));
  const [swapping, setSwapping] = useState<RoutineExercise | null>(null);
  const [moving, setMoving] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const byId = useMemo(() => new Map(ctx.library.map((e) => [e.id, e])), [ctx.library]);
  const names = useMemo(() => new Map(ctx.library.map((e) => [e.id, e.name])), [ctx.library]);

  if (isPending)
    return (
      <Screen title="Session" onBack={() => router.back()}>
        <Skeleton height={300} />
      </Screen>
    );
  if (!found) {
    return (
      <Screen title="Session" onBack={() => router.back()}>
        <EmptyState title="This session isn't in your plan any more" />
      </Screen>
    );
  }

  const { plan, day } = found;
  const state = stateOf(day, day.date, today);
  const open = isOpen(day);
  const current = swapping ? (byId.get(swapping.exerciseId) ?? null) : null;
  const options = current
    ? swapCandidates(
        plan.settings.input,
        day.templateKey,
        current.id,
        routine?.exercises.map((e) => e.exerciseId) ?? [],
        ctx.library,
      )
    : [];

  const chooseSwap = (to: PlanExercise, scope: EditScope) => {
    if (current) void actions.swap(plan, day.id, scope, current, to);
  };
  const fromLibrary = async () => {
    const from = current;
    setSwapping(null);
    const [picked] = await pickExercise();
    if (from && picked) setPending({ kind: 'swap', from, to: picked });
  };
  const applyScope = (scope: EditScope) => {
    if (pending?.kind === 'swap') void actions.swap(plan, day.id, scope, pending.from, pending.to);
    if (pending?.kind === 'regenerate') void actions.regenerate(plan, day.id, scope);
  };
  const skip = () =>
    Alert.alert(`Skip ${day.label}?`, 'The rest of the plan stays where it is.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip', style: 'destructive', onPress: () => actions.skip(plan, day.id) },
    ]);

  return (
    <Screen
      title={day.label}
      subtitle={`${formatPlanDate(day.date)} · week ${day.week}${isDeloadDay(plan, day) ? ' · deload' : ''}`}
      onBack={() => router.back()}
      edges={['top', 'bottom']}
      scroll
      footer={
        open && !plan.pausedAt ? (
          <Button
            label={state === 'today' ? 'Start session' : 'Start it now'}
            icon="play"
            fullWidth
            onPress={() => start({ kind: 'planDay', planDayId: day.id })}
          />
        ) : undefined
      }
    >
      <View className="gap-lg">
        <View className="flex-row flex-wrap items-center gap-sm">
          {state === 'done' ? <Tag label="Done" tone="success" icon="checkmark" /> : null}
          {state === 'missed' ? <Tag label="Missed" tone="danger" /> : null}
          {day.status === 'moved' ? (
            <Tag label={`Moved from ${formatPlanDate(day.originalDate)}`} />
          ) : null}
          {routine ? (
            <Text variant="caption" tone="muted">
              {routine.exercises.length} exercises · ~{routine.estimatedDurationMin} min
            </Text>
          ) : null}
        </View>
        {day.week === 1 && open ? (
          <Text variant="body" tone="muted">
            Week 1: weights start blank. Find a load that leaves about 2 reps in reserve; next week
            the app suggests your weights from what you log.
          </Text>
        ) : null}

        {routine ? (
          <SessionExercises
            exercises={routine.exercises}
            names={names}
            onSwap={open ? setSwapping : undefined}
          />
        ) : (
          <Skeleton height={200} />
        )}

        {open ? (
          <View className="gap-sm">
            <View className="flex-row gap-sm">
              <Button
                label="Move"
                icon="calendar-outline"
                variant="outline"
                className="flex-1"
                onPress={() => setMoving(true)}
              />
              <Button
                label="Regenerate"
                icon="shuffle"
                variant="outline"
                className="flex-1"
                onPress={() => setPending({ kind: 'regenerate' })}
              />
            </View>
            <Button label="Skip this session" variant="ghost" onPress={skip} />
          </View>
        ) : null}
      </View>

      <SwapSheet
        current={current}
        options={options}
        onPick={chooseSwap}
        onLibrary={() => void fromLibrary()}
        onClose={() => setSwapping(null)}
      />
      <ScopeSheet
        visible={!!pending}
        title={pending?.kind === 'swap' ? `Swap in ${pending.to.name}` : 'Regenerate session'}
        label={pending?.kind === 'swap' ? pending.from.name : day.label}
        onPick={applyScope}
        onClose={() => setPending(null)}
      />
      <MoveSheet
        day={moving ? day : null}
        today={today}
        onMove={(date) => actions.move(plan, day.id, date)}
        onClose={() => setMoving(false)}
      />
    </Screen>
  );
}

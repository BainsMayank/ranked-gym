import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Icon, ProgressBar, Skeleton, Tag, Text } from '@/components';
import { localDateKey, useActivePlan, type PlanDay } from '@/lib/plans';

import { formatPlanDate } from '../plan/format';
import { MissedSheet } from '../plan/components/MissedSheet';
import { TodaySession } from '../plan/components/TodaySession';
import { usePlanActions } from '../plan/hooks/usePlanActions';
import { planView } from '../plan/view';
import { WeekStrip } from './WeekStrip';

/** My Plan at the top of the Workout tab: today's session, this week, and progress. */
export function PlanCard() {
  const router = useRouter();
  const { data: plan, isPending } = useActivePlan();
  const actions = usePlanActions();
  const [missed, setMissed] = useState<PlanDay | null>(null);

  if (isPending) return <Skeleton height={180} />;
  if (!plan) {
    return (
      <Card className="gap-md">
        <Text variant="overline" tone="muted">
          Your plan
        </Text>
        <Text variant="heading">A plan built around your week</Text>
        <Text variant="body" tone="muted">
          Answer seven questions and get sessions that fit your time, kit and goal, with weights
          that move up as you get stronger.
        </Text>
        <Button label="Create a plan" fullWidth onPress={() => router.push('/plan/new')} />
      </Card>
    );
  }

  const view = planView(plan, localDateKey(new Date()));
  const firstMissed = view.missed[0];
  return (
    <Card className="gap-md">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${plan.name}, week ${view.week} of ${view.weeks}. Open plan`}
        onPress={() => router.push('/plan')}
        className="flex-row items-start justify-between gap-md active:opacity-70"
      >
        <View className="flex-1 gap-xxs">
          <Text variant="overline" tone="muted">
            Your plan
          </Text>
          <Text variant="subheading">{plan.name}</Text>
        </View>
        <Tag label={`Week ${Math.min(view.week, view.weeks)} of ${view.weeks}`} tone="primary" />
        <Icon name="chevron-forward" size={18} tone="textMuted" />
      </Pressable>

      {view.finished ? (
        <View className="gap-sm">
          <Text variant="heading">Plan complete</Text>
          <Text variant="caption" tone="muted">
            {view.done} of {view.total} sessions done. Ready for the next block?
          </Text>
          <Button
            label="Create your next plan"
            fullWidth
            onPress={() => router.push('/plan/new')}
          />
        </View>
      ) : (
        <TodaySession
          today={view.today}
          next={view.next}
          paused={view.paused}
          onResume={() => actions.resume(plan)}
        />
      )}

      <WeekStrip
        days={view.strip}
        onPressDay={(d) =>
          d.day && router.push({ pathname: '/plan/day/[id]', params: { id: d.day.id } })
        }
      />

      {firstMissed && !view.finished ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Missed ${firstMissed.label}. Shift the week or skip it`}
          onPress={() => setMissed(firstMissed)}
          className="flex-row items-center gap-sm rounded-md bg-surface-raised px-md py-sm active:opacity-70"
        >
          <Icon name="alert-circle-outline" size={18} tone="warning" />
          <Text variant="label" className="flex-1">
            Missed {firstMissed.label} on {formatPlanDate(firstMissed.date)}
          </Text>
          <Text variant="label" tone="primary">
            Sort it
          </Text>
        </Pressable>
      ) : null}

      <View className="gap-xs">
        <ProgressBar
          progress={view.total ? view.done / view.total : 0}
          tone="neutral"
          accessibilityLabel={`${view.done} of ${view.total} sessions done`}
        />
        <Text variant="caption" tone="muted" numeric>
          {view.done} of {view.total} sessions done
        </Text>
      </View>

      <MissedSheet plan={plan} day={missed} onClose={() => setMissed(null)} />
    </Card>
  );
}

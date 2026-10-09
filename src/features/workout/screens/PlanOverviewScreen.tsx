import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  EmptyState,
  Icon,
  IconButton,
  ListGroup,
  ListItem,
  ProgressBar,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components';
import { useExercises } from '@/lib/exercises';
import {
  addDays,
  groupTargets,
  localDateKey,
  mondayOf,
  previewSplit,
  useActivePlan,
  volumeOfSessions,
} from '@/lib/plans';

import { PlanCalendar } from '../plan/components/PlanCalendar';
import { PlanMenuSheet } from '../plan/components/PlanMenuSheet';
import { VolumeBars } from '../plan/components/VolumeBars';
import { formatPlanDate } from '../plan/format';
import { usePlanRoutines } from '../plan/hooks/usePlanRoutines';
import { planView, stateOf } from '../plan/view';

const STATE_TEXT = {
  done: 'Done',
  missed: 'Missed',
  today: 'Today',
  upcoming: 'Coming up',
  rest: '',
};

/** The active plan: calendar, a week's sessions and volume, and why it's built this way. */
export function PlanOverviewScreen() {
  const router = useRouter();
  const { data: plan, isPending } = useActivePlan();
  const { data: routines } = usePlanRoutines(plan);
  const { data: library } = useExercises();
  const [today] = useState(() => localDateKey(new Date()));
  const [week, setWeek] = useState(() => mondayOf(today));
  const [menu, setMenu] = useState(false);
  const byId = useMemo(() => new Map((library ?? []).map((e) => [e.id, e])), [library]);

  if (isPending)
    return (
      <Screen title="Your plan" onBack={() => router.back()}>
        <Skeleton height={320} />
      </Screen>
    );
  if (!plan) {
    return (
      <Screen title="Your plan" onBack={() => router.back()}>
        <EmptyState
          title="No plan yet"
          description="Answer seven questions and get a plan built around your week."
          action={{ label: 'Create a plan', onPress: () => router.replace('/plan/new') }}
        />
      </Screen>
    );
  }

  const view = planView(plan, today);
  const weekDays = plan.days.filter((d) => d.date >= week && d.date <= addDays(week, 6));
  const sessions = weekDays
    .filter((d) => d.status !== 'missed')
    .map((d) => (d.routineId ? (routines?.get(d.routineId)?.exercises ?? []) : []));
  const volume = volumeOfSessions(sessions, byId);
  // A part week (the first one started mid-week, or one with skipped sessions) isn't held to the
  // weekly range.
  const perWeek = previewSplit(plan.settings.input).week.length;
  const partial = sessions.length < perWeek;
  const open = (id: string) => router.push({ pathname: '/plan/day/[id]', params: { id } });

  return (
    <Screen
      title={plan.name}
      subtitle={`${previewSplit(plan.settings.input).label} · week ${Math.min(view.week, view.weeks)} of ${view.weeks}${view.paused ? ' · paused' : ''}`}
      onBack={() => router.back()}
      headerRight={
        <IconButton
          icon="ellipsis-horizontal"
          accessibilityLabel="Plan options"
          variant="surface"
          onPress={() => setMenu(true)}
        />
      }
      edges={['top', 'bottom']}
      scroll
    >
      <View className="gap-xl">
        <View className="gap-xs">
          <ProgressBar
            progress={view.total ? view.done / view.total : 0}
            tone="neutral"
            accessibilityLabel={`${view.done} of ${view.total} sessions done`}
          />
          <Text variant="caption" tone="muted" numeric>
            {view.done} of {view.total} sessions done · ends {formatPlanDate(plan.endDate)}
          </Text>
        </View>

        <PlanCalendar
          plan={plan}
          today={today}
          selectedMonday={week}
          onSelectWeek={setWeek}
          onPressDay={(d) => open(d.id)}
        />

        <View className="gap-sm">
          <SectionHeader title={`Week of ${formatPlanDate(week)}`} />
          {weekDays.length ? (
            <ListGroup>
              {weekDays.map((d) => (
                <ListItem
                  key={d.id}
                  title={d.label}
                  subtitle={formatPlanDate(d.date)}
                  value={STATE_TEXT[stateOf(d, d.date, today)]}
                  onPress={() => open(d.id)}
                />
              ))}
            </ListGroup>
          ) : (
            <Text variant="body" tone="muted">
              No sessions this week.
            </Text>
          )}
        </View>

        {weekDays.length ? (
          <View className="gap-md">
            <SectionHeader title="Sets per muscle this week" />
            {partial ? (
              <Text variant="caption" tone="muted">
                Part week: {sessions.length} of {perWeek} sessions, so these sit below the full-week
                range.
              </Text>
            ) : null}
            <VolumeBars
              sets={volume}
              targets={groupTargets(plan.settings.input)}
              partial={partial}
            />
          </View>
        ) : null}

        <ListGroup>
          <ListItem
            title="Why this plan"
            subtitle="The rules behind your split, sets and progression"
            leading={<Icon name="help-circle-outline" size={22} tone="textMuted" />}
            onPress={() => router.push('/plan/why')}
          />
        </ListGroup>
      </View>
      <PlanMenuSheet plan={plan} visible={menu} onClose={() => setMenu(false)} />
    </Screen>
  );
}

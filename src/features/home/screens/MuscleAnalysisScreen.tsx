import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { BodyMap, Card, ListGroup, ProgressBar, SegmentedControl, Text } from '@/components';
import type { Muscle } from '@/lib/exercises/taxonomy';
import { dateKey, useAnalytics, validDate } from '@/lib/insights';
import { muscleBalance, muscleRows } from '@/lib/insights/muscles';
import { useActivePlan } from '@/lib/plans';
import { useProfile } from '@/lib/profile';
import { spacing, useTheme } from '@/theme';

import { InsightFrame } from '../insights/InsightFrame';
import { RangeControl } from '../insights/RangeControl';

const periods = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '3 months' },
  { value: 'custom', label: 'Custom' },
];
export function MuscleAnalysisScreen() {
  const [period, setPeriod] = useState('7');
  const [mode, setMode] = useState('sets');
  const [selected, setSelected] = useState<Muscle | null>(null);
  const [custom, setCustom] = useState(() => ({
    start: dateKey(new Date(Date.now() - 6 * 86400000)),
    end: dateKey(new Date()),
  }));
  const bounds =
    period === 'custom' &&
    validDate(custom.start) &&
    validDate(custom.end) &&
    custom.end >= custom.start
      ? {
          start: new Date(`${custom.start}T00:00:00`).toISOString(),
          end: new Date(`${custom.end}T23:59:59.999`).toISOString(),
        }
      : undefined;
  const safeBounds =
    bounds && Date.parse(bounds.end) - Date.parse(bounds.start) <= 366 * 86400000
      ? bounds
      : undefined;
  const query = useAnalytics(Number(period) || 7, safeBounds);
  const { data: profile } = useProfile();
  const { data: plan } = useActivePlan();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const data = query.data;
  const rows = data
    ? muscleRows(
        data,
        plan?.settings.input.level ?? profile?.experience_level ?? 'beginner',
        plan?.settings.input.goal ?? profile?.primary_goal ?? 'general',
        plan?.settings.input.priorities ?? [],
      )
    : [];
  const values = Object.fromEntries(
    rows.map((r) => [r.muscle, mode === 'sets' ? r.sets : r.volume]),
  );
  const max = Math.max(1, ...Object.values(values));
  const balance = data ? muscleBalance(data) : [];
  const total = balance.reduce((s, b) => s + b.value, 0);
  return (
    <InsightFrame title="Muscle Analysis" query={query}>
      <RangeControl
        value={period}
        onChange={setPeriod}
        options={periods}
        custom={custom}
        onCustom={setCustom}
      />
      {period === 'custom' && !safeBounds ? (
        <Text tone="danger">Choose a valid range up to 366 days. Showing the last 7 days.</Text>
      ) : null}
      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={[
          { value: 'sets', label: 'Working sets' },
          { value: 'volume', label: 'Volume (kg)' },
        ]}
        accessibilityLabel="Body map measure"
      />
      <BodyMap<number>
        values={values}
        width={width - spacing.lg * 2}
        showLabels
        selected={selected}
        onMusclePress={setSelected}
        colourScale={(v) =>
          v === 0
            ? colors.surfaceRaised
            : v / max > 0.66
              ? colors.primary
              : v / max > 0.33
                ? colors.textMuted
                : colors.edge
        }
        accessibilityLabel={`Muscle training heat map in ${mode}. Exact values are listed below.`}
      />
      <Text variant="caption" tone="muted">
        Neutral: no work. Brighter: more work. Primary sets count 1, secondary sets 0.5. Muscle
        totals overlap.
      </Text>
      <Card className="gap-sm">
        <Text variant="subheading">Push / pull / legs</Text>
        <ProgressBar
          progress={0}
          segments={balance.map((b, index) => ({
            value: b.value,
            tone: index === 0 ? 'text' : index === 1 ? 'textMuted' : 'edge',
          }))}
          accessibilityLabel={balance
            .map((b) => `${b.label}: ${total ? Math.round((b.value / total) * 100) : 0}%`)
            .join(', ')}
        />
        <View className="flex-row flex-wrap gap-md">
          {balance.map((b) => (
            <Text key={b.label} variant="label" numeric>
              {b.label} · {total ? Math.round((b.value / total) * 100) : 0}%
            </Text>
          ))}
        </View>
        <Text variant="caption" tone="muted">
          Share of weighted sets in these groups. Core is shown separately below.
        </Text>
      </Card>
      <Text variant="heading">Muscles worked</Text>
      <Text variant="caption" tone="muted">
        Range bands are weekly guidance from your experience and goal in Plan Engine. Counts are
        scaled to 7 days. The outlined band marks the recommended range; the plan uses group-level
        weighting.
      </Text>
      <ListGroup>
        {rows.map((r) => (
          <View key={r.muscle} className="gap-xs p-lg">
            <Text variant="subheading" tone={selected === r.muscle ? 'primary' : 'default'}>
              {r.label}
            </Text>
            <Text numeric>
              {r.sets.toFixed(1)} sets · {Math.round(r.volume).toLocaleString('en-IN')} kg
            </Text>
            <Text
              variant="caption"
              tone={r.status === 'Under' || r.status === 'Over' ? 'warning' : 'muted'}
              numeric
            >
              {r.status}
              {r.min !== null
                ? ` · ${r.weekly.toFixed(1)} weekly-equivalent · band ${r.min} to ${r.max}`
                : ''}
            </Text>
            {r.max !== null ? (
              <ProgressBar
                progress={r.weekly / Math.max(r.weekly, r.max * 1.5)}
                band={[
                  r.min! / Math.max(r.weekly, r.max * 1.5),
                  r.max / Math.max(r.weekly, r.max * 1.5),
                ]}
                tone="neutral"
                accessibilityLabel={`${r.label}: ${r.status}; weekly range ${r.min} to ${r.max} sets`}
              />
            ) : null}
          </View>
        ))}
      </ListGroup>
      <Text variant="subheading">Needs attention</Text>
      <Text tone="muted">
        {rows
          .filter((r) => r.status === 'Under')
          .map((r) => r.label)
          .join(', ') || 'No muscles below their guidance range.'}
      </Text>
    </InsightFrame>
  );
}

import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { BodyMap, Chip, ListGroup, ProgressBar, SegmentedControl, Text } from '@/components';
import { muscleLabels, type Muscle } from '@/lib/exercises/taxonomy';
import { READY, recoveryNow, useAnalytics, useClock, useRecoverySpeed } from '@/lib/insights';
import { errorMessage } from '@/lib/sync/types';
import { spacing, useTheme } from '@/theme';

import { InsightFrame } from '../insights/InsightFrame';

export function RecoveryScreen() {
  const query = useAnalytics(7);
  const now = useClock();
  const update = useRecoverySpeed();
  const [selected, setSelected] = useState<Muscle | null>(null);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const data = query.data;
  const rows = data ? recoveryNow(data.fatigue, Date.parse(data.asOf), now, data.speed) : [];
  const values = Object.fromEntries(rows.map((r) => [r.muscle, r.percent]));
  return (
    <InsightFrame title="Recovery" query={query}>
      <Text variant="heading">Ready for your next session?</Text>
      <Text tone="muted">
        This is an estimate from logged training. Sleep, food and stress matter. Listen to how you
        feel.
      </Text>
      <BodyMap<number>
        values={values}
        width={width - spacing.lg * 2}
        showLabels
        selected={selected}
        onMusclePress={setSelected}
        colourScale={(p) =>
          p >= READY ? colors.success : p >= 50 ? colors.warning : colors.danger
        }
        accessibilityLabel="Recovery map. Red below 50%, amber below 80%, green ready. Exact values below."
      />
      <Text variant="caption" tone="muted">
        Red: below 50% · Amber: 50 to 79% · Green: 80% or more
      </Text>
      <Text variant="subheading">Recovery speed</Text>
      <SegmentedControl
        value={data?.speed ?? 'normal'}
        onChange={(s) => update.mutate(s)}
        options={[
          { value: 'slower', label: 'Slower' },
          { value: 'normal', label: 'Normal' },
          { value: 'faster', label: 'Faster' },
        ]}
        accessibilityLabel="Recovery speed"
      />
      {update.isPending ? (
        <Text variant="caption" tone="muted">
          Saving and recalculating…
        </Text>
      ) : null}
      {update.isError ? <Text tone="danger">{errorMessage(update.error)}</Text> : null}
      <View className="flex-row flex-wrap gap-sm">
        {rows
          .filter((r) => r.ready)
          .map((r) => (
            <Chip
              key={r.muscle}
              label={`${muscleLabels[r.muscle]} ready`}
              onPress={() => setSelected(r.muscle)}
              selected={selected === r.muscle}
            />
          ))}
      </View>
      <Text variant="heading">Least recovered first</Text>
      <ListGroup>
        {rows.map((r) => (
          <View key={r.muscle} className="gap-xs p-lg">
            <View className="flex-row justify-between gap-sm">
              <Text className="flex-1" tone={selected === r.muscle ? 'primary' : 'default'}>
                {muscleLabels[r.muscle]}
              </Text>
              <Text numeric>{Math.round(r.percent)}%</Text>
            </View>
            <ProgressBar
              progress={r.percent / 100}
              tone={r.ready ? 'success' : 'neutral'}
              accessibilityLabel={`${muscleLabels[r.muscle]} estimated recovery`}
            />
            <Text variant="caption" tone="muted">
              {r.lastTrained
                ? `Last trained ${new Date(r.lastTrained).toLocaleString('en-IN')}`
                : 'No logged training load'}
            </Text>
          </View>
        ))}
      </ListGroup>
      <Text variant="caption" tone="muted">
        Each working set adds fatigue according to muscle involvement and effort. It halves over 24
        to 60 hours at normal speed. Ready means at least 80%. Updates every minute, including
        offline.
      </Text>
    </InsightFrame>
  );
}

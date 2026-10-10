import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, PressableScale, ShareToFeedButton, Tag, Text } from '@/components';
import { RECORD_KIND_LABELS, recordSet, recordValue, type RecordGroup } from '@/lib/ranks';
import type { WeightUnit } from '@/lib/units';

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** One exercise's current bests; tap to see every record and baseline, newest first. */
export function RecordGroupCard({ group, unit }: { group: RecordGroup; unit: WeightUnit }) {
  const [open, setOpen] = useState(false);
  const bests = group.bests.slice(0, 6);

  return (
    <Card className="gap-sm">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${group.exerciseName}, ${group.history.length} records`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        className="gap-sm"
      >
        <View className="flex-row items-center justify-between gap-sm">
          <Text variant="subheading" className="flex-1">
            {group.exerciseName}
          </Text>
          <Text variant="caption" tone="muted">
            {open ? 'Hide' : `${group.history.length} records`}
          </Text>
        </View>
        {bests.map((b) => (
          <View key={`${b.kind}:${b.weightKg ?? ''}`} className="flex-row justify-between gap-sm">
            <Text variant="label" tone="muted">
              {RECORD_KIND_LABELS[b.kind]}
            </Text>
            <Text variant="label" numeric>
              {recordValue(b, unit)}
            </Text>
          </View>
        ))}
      </PressableScale>
      {open
        ? group.history.map((r) => {
            const set = recordSet(r, unit);
            return (
              <View
                key={`${r.kind}:${r.weightKg ?? ''}:${r.achievedAt}`}
                className="gap-xs border-t border-border pt-sm"
              >
                <View className="flex-row items-center gap-sm">
                  <Text variant="label" className="flex-1" numeric>
                    {RECORD_KIND_LABELS[r.kind]}: {recordValue(r, unit)}
                  </Text>
                  {r.previousValue === null ? (
                    <Tag label="Baseline" />
                  ) : (
                    <Tag label="PR" tone="success" />
                  )}
                </View>
                <Text variant="caption" tone="muted" numeric>
                  {r.previousValue !== null
                    ? `Was ${recordValue(r, unit, r.previousValue)} · `
                    : ''}
                  {set ? `${set} · ` : ''}
                  {r.workoutName} · {DATE.format(new Date(r.achievedAt))}
                </Text>
                <View className="flex-row gap-sm">
                  <Button
                    label="Workout"
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      router.push({ pathname: '/workouts/[id]', params: { id: r.workoutId } })
                    }
                  />
                  {r.previousValue !== null ? (
                    <ShareToFeedButton
                      milestone={{
                        kind: 'pr',
                        workoutId: r.workoutId,
                        exerciseId: r.exerciseId,
                        prKind: r.kind,
                      }}
                    />
                  ) : null}
                </View>
              </View>
            );
          })
        : null}
    </Card>
  );
}

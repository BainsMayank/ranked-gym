import { View } from 'react-native';

import { RankTag, Tag, Text } from '@/components';
import type { WorkoutSummary } from '@/lib/social';
import type { WeightUnit } from '@/lib/units';
import { formatVolume } from '@/lib/workouts/summary';

import { bestSetText, formatSessionLength } from '../format';
import { MuscleThumb } from './MuscleThumb';

/** Workout name, one line of totals, the first three exercises with their best set, and marks. */
export function WorkoutPostBody({ workout, unit }: { workout: WorkoutSummary; unit: WeightUnit }) {
  const length = formatSessionLength(workout.durationSec);
  const totals = [
    length,
    workout.volumeKg > 0 ? formatVolume(workout.volumeKg, unit) : null,
    `${workout.sets} ${workout.sets === 1 ? 'set' : 'sets'}`,
  ].filter(Boolean);
  const more = workout.exerciseCount - workout.exercises.length;
  return (
    <View className="gap-sm">
      <View className="flex-row gap-md">
        <View className="flex-1 gap-sm">
          <View className="gap-xxs">
            <Text variant="heading" numberOfLines={2}>
              {workout.name}
            </Text>
            <Text variant="label" tone="muted" numeric>
              {totals.join('  ·  ')}
            </Text>
          </View>
          {workout.exercises.length > 0 ? (
            <View className="border-t border-border">
              {workout.exercises.map((e) => (
                <View
                  key={e.exerciseId}
                  className="flex-row items-center gap-sm border-b border-border py-sm"
                >
                  <Text variant="label" numberOfLines={1} className="flex-1">
                    {e.name}
                  </Text>
                  {e.pr ? <Tag label="PR" tone="success" /> : null}
                  <Text variant="label" tone="muted" numeric>
                    {bestSetText(e.best, e.logType, unit)}
                  </Text>
                </View>
              ))}
              {more > 0 ? (
                <Text variant="caption" tone="muted" className="pt-xs">
                  +{more} more {more === 1 ? 'exercise' : 'exercises'}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        <MuscleThumb muscles={workout.muscles} width={56} />
      </View>
      {workout.records > 0 || workout.rankUps.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-sm">
          {workout.records > 0 ? (
            <Tag
              label={workout.records === 1 ? '1 record' : `${workout.records} records`}
              tone="success"
              icon="trophy-outline"
            />
          ) : null}
          {workout.rankUps.slice(0, 2).map((r) => (
            <View key={`${r.scope}:${r.key}`} className="flex-row items-center gap-xs">
              <Text variant="caption" tone="muted">
                {r.scope === 'overall' ? 'Overall' : r.name}
              </Text>
              <RankTag tier={r.rank.tier} division={r.rank.division} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

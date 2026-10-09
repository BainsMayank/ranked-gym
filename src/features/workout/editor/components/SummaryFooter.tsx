import { Pressable, ScrollView, View } from 'react-native';

import { Icon, ProgressBar, Sheet, Text } from '@/components';
import { muscleLabels, muscleShortLabels } from '@/lib/exercises';
import { formatSetCount, type RoutineSummary } from '@/lib/routines';

import { useRoutineEditor } from '../store';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1));

/** Pinned live summary: sets, working sets, time, and the muscles hit (weighted set counts). */
export function SummaryFooter({ summary }: { summary: RoutineSummary }) {
  const top = summary.muscles.slice(0, 3);
  const line = `${summary.totalSets} sets · ${summary.workingSets} working · ~${summary.durationMin} min`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${line}. ${top.map((m) => `${muscleLabels[m.muscle]} ${formatSetCount(m.sets)}`).join(', ')}`}
      accessibilityHint="Shows every muscle this routine trains"
      onPress={() => useRoutineEditor.getState().openSheet({ kind: 'muscles' })}
      className="min-h-12 flex-row items-center gap-md active:opacity-70"
    >
      <View className="flex-1 gap-xxs">
        <Text variant="label" numeric>
          {line}
        </Text>
        <Text variant="caption" tone="muted" numeric numberOfLines={1}>
          {top.length
            ? top.map((m) => `${muscleShortLabels[m.muscle]} ${fmt(m.sets)}`).join(' · ')
            : 'Add exercises to see the muscles you hit'}
        </Text>
      </View>
      <Icon name="chevron-up" size={18} tone="textMuted" />
    </Pressable>
  );
}

/** Every muscle with its weighted working sets (warm-ups don't count). */
export function MuscleSheet({ summary }: { summary: RoutineSummary }) {
  const open = useRoutineEditor((s) => s.sheet?.kind === 'muscles');
  const max = summary.muscles[0]?.sets ?? 1;
  return (
    <Sheet
      visible={open}
      onClose={() => useRoutineEditor.getState().openSheet(null)}
      title="Muscles hit"
    >
      <ScrollView style={{ maxHeight: 440 }} contentContainerClassName="gap-md pb-sm">
        <Text variant="caption" tone="muted">
          Working sets per muscle. Secondary muscles count half (or a quarter); warm-ups don’t
          count.
        </Text>
        {summary.muscles.map((m) => (
          <View key={m.muscle} className="gap-xs">
            <View className="flex-row justify-between">
              <Text variant="label">{muscleLabels[m.muscle]}</Text>
              <Text variant="label" tone="muted" numeric>
                {fmt(m.sets)}
              </Text>
            </View>
            <ProgressBar
              progress={m.sets / max}
              tone="neutral"
              accessibilityLabel={`${muscleLabels[m.muscle]}, ${formatSetCount(m.sets)}`}
            />
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

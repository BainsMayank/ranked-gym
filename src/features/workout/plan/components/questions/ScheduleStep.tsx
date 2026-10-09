import { View } from 'react-native';

import { Chip, SegmentedControl, Text } from '@/components';
import { backToBackPairs, previewSplit, weekdayShort } from '@/lib/plans';

import { DayPicker } from '../../../components/DayPicker';
import { usePlanDraft } from '../../draft';
import { QuestionFrame } from '../QuestionFrame';

const MODES = [
  { value: 'count', label: 'Days per week' },
  { value: 'weekdays', label: 'Specific days' },
] as const;

const COUNTS = [2, 3, 4, 5, 6] as const;

export function ScheduleStep({ onNext }: { onNext: () => void }) {
  const input = usePlanDraft((s) => s.input);
  const update = usePlanDraft((s) => s.update);
  const { schedule } = input;
  const weekdays = schedule.kind === 'weekdays' ? schedule.weekdays : [];
  const valid = schedule.kind === 'count' || (weekdays.length >= 2 && weekdays.length <= 6);
  const pairs = backToBackPairs(weekdays);
  const split = valid ? previewSplit(input) : null;

  const setMode = (kind: (typeof MODES)[number]['value']) =>
    update({
      schedule:
        kind === 'count'
          ? { kind, days: Math.min(6, Math.max(2, weekdays.length || 3)) }
          : { kind, weekdays: [0, 2, 4] },
    });
  const toggle = (d: number) =>
    update({
      schedule: {
        kind: 'weekdays',
        weekdays: weekdays.includes(d)
          ? weekdays.filter((x) => x !== d)
          : [...weekdays, d].sort((a, b) => a - b),
      },
    });

  return (
    <QuestionFrame
      title="When can you train?"
      subtitle="Pick a number and we'll space the days, or choose the exact days."
      onContinue={onNext}
      continueDisabled={!valid}
      note={
        split
          ? `${split.label}: ${split.week.map((d) => `${weekdayShort[d.weekday]} ${d.label}`).join(' · ')}`
          : undefined
      }
    >
      <SegmentedControl
        accessibilityLabel="Schedule type"
        options={MODES}
        value={schedule.kind}
        onChange={setMode}
      />
      {schedule.kind === 'count' ? (
        <View className="flex-row flex-wrap gap-sm">
          {COUNTS.map((n) => (
            <Chip
              key={n}
              label={`${n} days`}
              selected={schedule.days === n}
              onPress={() => update({ schedule: { kind: 'count', days: n } })}
            />
          ))}
        </View>
      ) : (
        <View className="gap-sm">
          <DayPicker selected={weekdays} onToggle={toggle} />
          <Text variant="caption" tone={valid ? 'muted' : 'warning'}>
            {weekdays.length < 2
              ? 'Pick at least 2 days.'
              : weekdays.length > 6
                ? 'Keep at least one rest day.'
                : pairs.length
                  ? 'Some days are back to back: those sessions will train different muscles.'
                  : `${weekdays.length} days, each with a rest day around it.`}
          </Text>
        </View>
      )}
    </QuestionFrame>
  );
}

import { ListGroup, ListItem, SectionHeader, Sheet, Text } from '@/components';
import { usePersonalRecords } from '@/lib/ranks';
import type { Attachment } from '@/lib/social';
import type { WeightUnit } from '@/lib/units';
import { useWorkoutHistory } from '@/lib/workouts';

import { prKindLabel, prValueText, timeAgo } from '../format';

export interface AttachChoice {
  attach: Attachment;
  label: string;
}

/** Attach one of my recent workouts or records to a post. */
export function AttachSheet({
  visible,
  unit,
  onClose,
  onPick,
}: {
  visible: boolean;
  unit: WeightUnit;
  onClose: () => void;
  onPick: (choice: AttachChoice) => void;
}) {
  const history = useWorkoutHistory();
  const records = usePersonalRecords();
  const workouts = (history.data ?? []).slice(0, 6);
  const prs = (records.data ?? [])
    .filter((r) => r.previousValue !== null)
    .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt))
    .slice(0, 6);
  const pick = (c: AttachChoice) => {
    onPick(c);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Attach">
      <SectionHeader title="Recent workouts" />
      {workouts.length === 0 ? (
        <Text tone="muted" className="pb-md">
          Finished workouts show here.
        </Text>
      ) : (
        <ListGroup className="mb-lg">
          {workouts.map((w) => (
            <ListItem
              key={w.id}
              title={w.name}
              subtitle={`${timeAgo(w.startedAt)} · ${w.exerciseCount} exercises`}
              onPress={() => pick({ attach: { workoutId: w.id }, label: w.name })}
            />
          ))}
        </ListGroup>
      )}
      <SectionHeader title="Recent records" />
      {prs.length === 0 ? (
        <Text tone="muted">Records you beat show here.</Text>
      ) : (
        <ListGroup>
          {prs.map((r) => (
            <ListItem
              key={`${r.workoutId}:${r.exerciseId}:${r.kind}`}
              title={r.exerciseName}
              subtitle={`${prKindLabel(r.kind)} · ${prValueText(r, r.value, unit)}`}
              onPress={() =>
                pick({
                  attach: {
                    pr: { workoutId: r.workoutId, exerciseId: r.exerciseId, kind: r.kind },
                  },
                  label: `${r.exerciseName} PR`,
                })
              }
            />
          ))}
        </ListGroup>
      )}
    </Sheet>
  );
}

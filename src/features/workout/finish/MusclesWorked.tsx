import { ListGroup, ListItem, Text } from '@/components';
import { muscleLabels } from '@/lib/exercises';
import { formatSetCount, type MuscleSets } from '@/lib/routines';

/** Muscles trained, by weighted working sets (a simple list until the body map, Phase 7). */
export function MusclesWorked({ muscles }: { muscles: MuscleSets[] }) {
  if (muscles.length === 0) {
    return (
      <Text variant="caption" tone="muted">
        Tick a working set to see the muscles it trained.
      </Text>
    );
  }
  return (
    <ListGroup>
      {muscles.slice(0, 8).map((m) => (
        <ListItem key={m.muscle} title={muscleLabels[m.muscle]} value={formatSetCount(m.sets)} />
      ))}
    </ListGroup>
  );
}

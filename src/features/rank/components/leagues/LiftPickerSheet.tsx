import { ScrollView } from 'react-native';

import { Icon, ListGroup, ListItem, Sheet } from '@/components';
import type { RankLift } from '@/lib/ranks';

/** Pick one rankable lift (lift-improvement leagues and challenges). */
export function LiftPickerSheet({
  visible,
  lifts,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  lifts: readonly RankLift[];
  selected: string | null;
  onSelect: (rankKey: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Pick a lift">
      <ScrollView style={{ maxHeight: 460 }} contentContainerClassName="pb-md">
        <ListGroup>
          {lifts.map((l) => (
            <ListItem
              key={l.rankKey}
              title={l.name}
              subtitle={l.discipline === 'weightlifting' ? 'Weightlifting' : 'Calisthenics'}
              trailing={l.rankKey === selected ? <Icon name="checkmark" /> : undefined}
              onPress={() => {
                onSelect(l.rankKey);
                onClose();
              }}
            />
          ))}
        </ListGroup>
      </ScrollView>
    </Sheet>
  );
}

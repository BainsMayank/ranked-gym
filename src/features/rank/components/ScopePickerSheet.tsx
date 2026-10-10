import { ScrollView, View } from 'react-native';

import { Icon, ListGroup, ListItem, Sheet, Text } from '@/components';
import type { RankScope } from '@/lib/game/engine/types';

export interface ScopeOption {
  scope: RankScope;
  key: string;
  label: string;
}

export interface ScopePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  sections: { title: string; options: ScopeOption[] }[];
  selected: { scope: RankScope; key: string };
  onSelect: (option: ScopeOption) => void;
}

/** Pick what the progression chart follows: overall, a discipline, a region or a lift. */
export function ScopePickerSheet({
  visible,
  onClose,
  sections,
  selected,
  onSelect,
}: ScopePickerSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Show progression for">
      <ScrollView style={{ maxHeight: 480 }} contentContainerClassName="gap-lg pb-md">
        {sections
          .filter((s) => s.options.length > 0)
          .map((section) => (
            <View key={section.title} className="gap-xs">
              <Text variant="overline" tone="muted">
                {section.title}
              </Text>
              <ListGroup>
                {section.options.map((o) => {
                  const active = o.scope === selected.scope && o.key === selected.key;
                  return (
                    <ListItem
                      key={`${o.scope}:${o.key}`}
                      title={o.label}
                      subtitle={active ? 'Showing now' : undefined}
                      trailing={active ? <Icon name="checkmark" /> : <View />}
                      onPress={() => {
                        onSelect(o);
                        onClose();
                      }}
                    />
                  );
                })}
              </ListGroup>
            </View>
          ))}
      </ScrollView>
    </Sheet>
  );
}

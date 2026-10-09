import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ListGroup, ListItem, OptionCard, Sheet, Text } from '@/components';
import { equipmentLabels } from '@/lib/exercises';
import type { EditScope, PlanExercise } from '@/lib/plans';

interface SwapSheetProps {
  current: PlanExercise | null;
  options: PlanExercise[];
  onPick: (exercise: PlanExercise, scope: EditScope) => void;
  onLibrary: () => void;
  onClose: () => void;
}

/**
 * Alternatives the engine allows here (same movement, your kit, nothing you avoid), or the library.
 * Choosing one asks how far the swap goes in the same sheet (iOS can't open a second modal while
 * the first is closing).
 */
export function SwapSheet({ current, options, onPick, onLibrary, onClose }: SwapSheetProps) {
  const [chosen, setChosen] = useState<PlanExercise | null>(null);
  const close = () => {
    setChosen(null);
    onClose();
  };
  const pick = (scope: EditScope) => {
    if (chosen) onPick(chosen, scope);
    close();
  };
  const title = chosen ? `Swap in ${chosen.name}` : current ? `Swap ${current.name}` : undefined;

  return (
    <Sheet visible={!!current} onClose={close} title={title}>
      {chosen ? (
        <View className="gap-sm">
          <Text variant="body" tone="muted">
            For this session only, or every week it comes up?
          </Text>
          <OptionCard
            wide
            title="Just this session"
            subtitle="Other weeks stay as they are."
            selected={false}
            onPress={() => pick('day')}
          />
          <OptionCard
            wide
            title="Every week"
            subtitle="Done sessions keep what you logged."
            selected={false}
            onPress={() => pick('every')}
          />
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 420 }}>
          <ListGroup>
            {options.slice(0, 8).map((e) => (
              <ListItem
                key={e.id}
                title={e.name}
                value={equipmentLabels[e.equipment]}
                onPress={() => setChosen(e)}
              />
            ))}
            <ListItem
              title="Choose from the library"
              subtitle={
                options.length ? 'Any exercise you like' : 'No close match fits your equipment'
              }
              onPress={onLibrary}
            />
          </ListGroup>
          <Text variant="caption" tone="muted" className="pt-sm">
            Sets and reps stay; the progression adapts to the new exercise.
          </Text>
        </ScrollView>
      )}
    </Sheet>
  );
}

import { Pressable, View } from 'react-native';

import { RankTag, Text } from '@/components';
import { rankLabel } from '@/lib/game';
import { cn } from '@/lib/utils';

import { muscleIds, muscles, type MuscleId } from '../mocks';

interface MuscleGridProps {
  selected: MuscleId;
  onSelect: (id: MuscleId) => void;
}

/** Every tracked muscle with its rank; the accessible way to pick a muscle on the body map. */
export function MuscleGrid({ selected, onSelect }: MuscleGridProps) {
  return (
    <View className="flex-row flex-wrap gap-sm">
      {muscleIds.map((id) => {
        const m = muscles[id];
        const isSel = id === selected;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityLabel={`${m.name}, ${rankLabel(m.rank.tier, m.rank.division)}`}
            accessibilityState={{ selected: isSel, checked: isSel }}
            onPress={() => onSelect(id)}
            style={{ flexBasis: '31%', flexGrow: 1 }}
            className={cn(
              'min-h-14 items-center justify-center gap-xxs rounded-md bg-surface px-xs py-sm',
              isSel && 'border border-text',
            )}
          >
            <Text variant="label">{m.name}</Text>
            <RankTag tier={m.rank.tier} division={m.rank.division} />
          </Pressable>
        );
      })}
    </View>
  );
}

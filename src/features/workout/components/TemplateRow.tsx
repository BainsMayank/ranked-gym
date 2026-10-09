import { View } from 'react-native';

import { Button, Text } from '@/components';
import { rankColors, type RankTier } from '@/theme';

interface TemplateRowProps {
  name: string;
  description: string;
  /** "5 exercises · ~35 min · Glutes, Lats, Quads" (null while the library downloads). */
  meta: string | null;
  colour: RankTier;
  added: boolean;
  onAdd: () => void;
}

/** One starter routine: what it is, how long it takes, and a one-tap Add. */
export function TemplateRow({ name, description, meta, colour, added, onAdd }: TemplateRowProps) {
  return (
    <View className="min-h-14 flex-row items-center gap-md px-lg py-md">
      <View className="flex-1 gap-xxs">
        <View className="flex-row items-center gap-sm">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: rankColors[colour].base }}
          />
          <Text variant="subheading" numberOfLines={1} className="flex-shrink">
            {name}
          </Text>
        </View>
        <Text variant="caption" tone="muted">
          {description}
        </Text>
        {meta ? (
          <Text variant="caption" tone="muted" numeric>
            {meta}
          </Text>
        ) : null}
      </View>
      <Button
        label={added ? 'Added' : 'Add'}
        icon={added ? 'checkmark' : 'add'}
        variant="outline"
        size="sm"
        disabled={!meta}
        accessibilityLabel={`Add ${name} to your routines`}
        onPress={onAdd}
      />
    </View>
  );
}

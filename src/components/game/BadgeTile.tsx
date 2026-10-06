import { View } from 'react-native';

import { cn } from '@/lib/utils';
import { rarityColors, type Rarity } from '@/theme';

import { Text } from '../Text';
import { HexEmblem } from './HexEmblem';

export interface BadgeTileProps {
  /** Short mark drawn on the badge, e.g. "100", "PR". */
  mark: string;
  label: string;
  rarity: Rarity;
  locked?: boolean;
  className?: string;
}

/** An earned (or locked) badge: rarity-coloured emblem with a short mark and a caption. */
export function BadgeTile({ mark, label, rarity, locked = false, className }: BadgeTileProps) {
  const c = rarityColors[rarity];
  return (
    <View
      accessible
      accessibilityLabel={`${label} badge, ${locked ? 'locked' : rarity}`}
      className={cn('w-20 items-center gap-xs', className)}
      style={{ opacity: locked ? 0.35 : 1 }}
    >
      <View className="items-center justify-center">
        <HexEmblem color={c.base} size={56} chevrons={0} fillOpacity={0.22} />
        <Text
          variant="label"
          numeric
          className="absolute"
          style={{ color: c.highlight }}
          maxFontSizeMultiplier={1.2}
        >
          {mark}
        </Text>
      </View>
      <Text variant="caption" tone="muted" numberOfLines={2} className="text-center">
        {label}
      </Text>
    </View>
  );
}

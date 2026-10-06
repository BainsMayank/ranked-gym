import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Chip, ListGroup, ListItem, Text } from '@/components';
import { tierName } from '@/lib/game';
import { cn } from '@/lib/utils';
import { rankColors, type RankTier } from '@/theme';

import { profileColors, titles } from '../mocks';

/** Cosmetics: profile colour, title, banner and emblem frame (unlocked through ranks and challenges). */
export function CustomiseCard() {
  const [color, setColor] = useState<RankTier>('champion');
  const [title, setTitle] = useState<(typeof titles)[number]>('The Grinder');

  return (
    <Card className="gap-md">
      <Text variant="subheading">Customise</Text>
      <Text variant="caption" tone="muted">
        Profile colour
      </Text>
      <View className="flex-row gap-md">
        {profileColors.map((t) => (
          <Pressable
            key={t}
            accessibilityRole="radio"
            accessibilityLabel={`${tierName(t)} colour`}
            accessibilityState={{ selected: t === color, checked: t === color }}
            onPress={() => setColor(t)}
            hitSlop={4}
            className={cn(
              'h-10 w-10 items-center justify-center rounded-full',
              t === color && 'border-2 border-text',
            )}
          >
            <View
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: rankColors[t].base }}
            />
          </Pressable>
        ))}
      </View>
      <Text variant="caption" tone="muted">
        Title (unlocked through ranks and challenges)
      </Text>
      <View className="flex-row flex-wrap gap-sm">
        {titles.map((t) => (
          <Chip key={t} label={t} selected={t === title} onPress={() => setTitle(t)} />
        ))}
      </View>
      <ListGroup className="bg-surface-raised">
        <ListItem title="Banner image" onPress={() => undefined} />
        <ListItem title="Emblem frame" onPress={() => undefined} />
      </ListGroup>
    </Card>
  );
}

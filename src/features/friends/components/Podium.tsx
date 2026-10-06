import { View } from 'react-native';

import { Avatar, RankTag, Text } from '@/components';
import { rankColors } from '@/theme';

import type { board } from '../mocks';

type Entry = (typeof board)[number];

const ORDER = [1, 0, 2] as const;
const HEIGHT = { 0: 96, 1: 72, 2: 56 } as const;

/** Top three, centre-first podium. Avatars ringed in their tier colour. */
export function Podium({ top }: { top: Entry[] }) {
  return (
    <View className="flex-row items-end gap-sm">
      {ORDER.map((i) => {
        const e = top[i];
        if (!e) return null;
        return (
          <View
            key={e.position}
            accessible
            accessibilityLabel={`${e.position}. ${e.name}, ${e.score}`}
            className="flex-1 items-center gap-xs"
          >
            <Avatar name={e.name} size={i === 0 ? 'xl' : 'lg'} ring={{ tier: e.rank.tier }} />
            <Text variant="label" numberOfLines={1}>
              {e.name}
            </Text>
            <RankTag tier={e.rank.tier} division={e.rank.division} />
            <View
              className="w-full items-center justify-center gap-xxs rounded-t-lg bg-surface"
              style={{ height: HEIGHT[i] }}
            >
              <Text
                variant="title"
                numeric
                style={i === 0 ? { color: rankColors.gold.base } : null}
              >
                {e.position}
              </Text>
              <Text variant="caption" tone="muted" numeric>
                {e.score}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

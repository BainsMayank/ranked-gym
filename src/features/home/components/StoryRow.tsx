import { Pressable, ScrollView, View } from 'react-native';

import { Avatar, Icon, Text } from '@/components';

import { stories } from '../mocks';

/** Friends who trained recently. Ringed = training now. First item posts your own update. */
export function StoryRow() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-md px-lg"
      className="-mx-lg"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Post an update"
        onPress={() => undefined}
        className="items-center gap-xs active:opacity-70"
      >
        <View className="h-[74px] w-[74px] items-center justify-center">
          <View className="h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-surface">
            <Icon name="add" size={24} tone="text" />
          </View>
        </View>
        <Text variant="caption" tone="muted">
          Post
        </Text>
      </Pressable>
      {stories.map((s) => (
        <Pressable
          key={s.name}
          accessibilityRole="button"
          accessibilityLabel={`${s.name}${s.active ? ', training now' : ''}`}
          onPress={() => undefined}
          className="items-center gap-xs active:opacity-70"
        >
          <View className="h-[74px] w-[74px] items-center justify-center">
            <Avatar name={s.name} size="lg" ring={s.active ? { rarity: 'legendary' } : undefined} />
          </View>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {s.name.split(' ')[0]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

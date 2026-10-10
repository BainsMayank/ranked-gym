import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Icon, IconButton, PressableScale, Text } from '@/components';
import type { Person, Visibility } from '@/lib/social';

import { displayName, timeAgo, visibilityIcon, visibilityWords } from '../format';

interface PostAuthorRowProps {
  author: Person;
  createdAt: string;
  visibility: Visibility;
  edited?: boolean;
  onMenu?: () => void;
}

/** Avatar with rank ring, name, @username, time and who can see it. */
export function PostAuthorRow({
  author,
  createdAt,
  visibility,
  edited,
  onMenu,
}: PostAuthorRowProps) {
  const name = displayName(author);
  const when = timeAgo(createdAt);
  const open = author.username
    ? () => router.push({ pathname: '/u/[username]', params: { username: author.username ?? '' } })
    : undefined;
  return (
    <View className="flex-row items-center gap-md">
      <PressableScale
        onPress={open}
        disabled={!open}
        accessibilityRole="link"
        accessibilityLabel={`${name}'s profile`}
        className="flex-1 flex-row items-center gap-md"
      >
        <Avatar
          name={name}
          uri={author.avatarUrl}
          size="md"
          ring={author.rank ? { tier: author.rank.tier } : undefined}
        />
        <View className="flex-1">
          <Text variant="subheading" numberOfLines={1}>
            {name}
          </Text>
          <View className="flex-row items-center gap-xs">
            <Text variant="caption" tone="muted" numberOfLines={1} className="shrink">
              {author.username ? `@${author.username} · ` : ''}
              {when}
              {edited ? ' · edited' : ''}
            </Text>
            <View accessible accessibilityLabel={`Visible to: ${visibilityWords[visibility]}`}>
              <Icon name={visibilityIcon[visibility]} size={12} tone="textMuted" />
            </View>
          </View>
        </View>
      </PressableScale>
      {onMenu ? (
        <IconButton
          icon="ellipsis-horizontal"
          accessibilityLabel="Post options"
          size="sm"
          onPress={onMenu}
          hitSlop={8}
        />
      ) : null}
    </View>
  );
}

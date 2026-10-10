import { Image } from 'expo-image';
import { View } from 'react-native';

import { IconButton, Skeleton } from '@/components';
import { POST_MEDIA_BUCKET, useMediaUrl } from '@/lib/social';

export type ThumbSource = { kind: 'local'; uri: string } | { kind: 'remote'; path: string };

const SIZE = 88;

function Thumb({
  source,
  index,
  onRemove,
}: {
  source: ThumbSource;
  index: number;
  onRemove: () => void;
}) {
  const remote = useMediaUrl(POST_MEDIA_BUCKET, source.kind === 'remote' ? source.path : null);
  const uri = source.kind === 'local' ? source.uri : remote.data;
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      {uri ? (
        <Image
          source={{ uri, cacheKey: source.kind === 'remote' ? source.path : undefined }}
          contentFit="cover"
          accessibilityLabel={`Photo ${index + 1}`}
          style={{ width: SIZE, height: SIZE, borderRadius: 12 }}
        />
      ) : (
        <Skeleton width={SIZE} height={SIZE} radius="md" />
      )}
      <View className="absolute -right-xs -top-xs">
        <IconButton
          icon="close"
          size="sm"
          variant="surface"
          accessibilityLabel={`Remove photo ${index + 1}`}
          onPress={onRemove}
        />
      </View>
    </View>
  );
}

/** The photos on a post being written, each with a remove button. */
export function PhotoThumbs({
  photos,
  onRemove,
}: {
  photos: readonly ThumbSource[];
  onRemove: (index: number) => void;
}) {
  if (photos.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-md pt-xs">
      {photos.map((p, i) => (
        <Thumb
          key={p.kind === 'local' ? p.uri : p.path}
          source={p}
          index={i}
          onRemove={() => onRemove(i)}
        />
      ))}
    </View>
  );
}

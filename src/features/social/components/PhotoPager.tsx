import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Skeleton, Text } from '@/components';
import { useMediaUrl, type MediaBucket, type PostMedia } from '@/lib/social';

/** Portrait 4:5 at most, landscape 1.91:1 at most (the common feed bounds). */
export function photoAspect(w: number, h: number): number {
  return Math.min(1.91, Math.max(0.8, w / Math.max(h, 1)));
}

function Photo({
  bucket,
  media,
  width,
  label,
}: {
  bucket: MediaBucket;
  media: PostMedia;
  width: number;
  label: string;
}) {
  const url = useMediaUrl(bucket, media.path);
  const height = width / photoAspect(media.w, media.h);
  if (!url.data) return <Skeleton width={width} height={height} radius="md" />;
  return (
    <Image
      source={{ uri: url.data, cacheKey: media.path }}
      recyclingKey={media.path}
      cachePolicy="memory-disk"
      contentFit="cover"
      transition={150}
      accessibilityLabel={label}
      style={{ width, height, borderRadius: 12 }}
    />
  );
}

/** Up to four photos, swiped sideways, with a "2 / 4" counter. */
export function PhotoPager({
  bucket,
  media,
  width,
  label,
}: {
  bucket: MediaBucket;
  media: readonly PostMedia[];
  width: number;
  label: string;
}) {
  const [page, setPage] = useState(0);
  if (media.length === 0 || width <= 0) return null;
  const first = media[0];
  if (media.length === 1 && first)
    return <Photo bucket={bucket} media={first} width={width} label={label} />;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ width }}
        accessibilityLabel={`${label}, ${media.length} photos`}
      >
        {media.map((m, i) => (
          <Photo
            key={m.path}
            bucket={bucket}
            media={m}
            width={width}
            label={`${label}, photo ${i + 1}`}
          />
        ))}
      </ScrollView>
      <View className="absolute right-sm top-sm rounded-sm bg-background/80 px-xs">
        <Text variant="caption" numeric>
          {page + 1} / {media.length}
        </Text>
      </View>
    </View>
  );
}

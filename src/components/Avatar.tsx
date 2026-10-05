import { useState } from 'react';
import { Image, View } from 'react-native';

import { cn } from '@/lib/utils';

import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: AvatarSize;
  className?: string;
}

const dimensions: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 64, xl: 96 };
const textVariant = { sm: 'caption', md: 'label', lg: 'heading', xl: 'title' } as const;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({ name, uri, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const d = dimensions[size];
  const showImage = !!uri && !failed;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name}'s avatar`}
      className={cn(
        'items-center justify-center overflow-hidden rounded-full bg-surface-raised',
        className,
      )}
      style={{ width: d, height: d }}
    >
      {showImage ? (
        <Image source={{ uri }} style={{ width: d, height: d }} onError={() => setFailed(true)} />
      ) : (
        <Text variant={textVariant[size]} tone="muted">
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

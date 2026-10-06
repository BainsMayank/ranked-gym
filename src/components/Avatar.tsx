import { useState } from 'react';
import { Image, View } from 'react-native';

import { cn } from '@/lib/utils';
import { rankColors, rarityColors, type Rarity, type RankTier } from '@/theme';

import { avatarFrameArt } from './game/artRegistry';
import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

/** Coloured ring showing the player's rank or an earned cosmetic's rarity. */
export type AvatarRing = { tier: RankTier } | { rarity: Rarity };

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: AvatarSize;
  ring?: AvatarRing;
  /** Cosmetic frame id (from the server). Drawn from avatarFrameArt; falls back to `ring` until art exists. */
  frameId?: string;
  /** Player level, shown as a small tag on lg/xl avatars. */
  level?: number;
  className?: string;
}

const dimensions: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 64, xl: 96 };
const ringWidth: Record<AvatarSize, number> = { sm: 2, md: 2, lg: 3, xl: 3 };
const textVariant = { sm: 'caption', md: 'label', lg: 'heading', xl: 'title' } as const;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

function ringColor(ring: AvatarRing): string {
  return 'tier' in ring ? rankColors[ring.tier].base : rarityColors[ring.rarity].base;
}

export function Avatar({ name, uri, size = 'md', ring, frameId, level, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const d = dimensions[size];
  const showImage = !!uri && !failed;
  const frame = frameId ? avatarFrameArt[frameId] : undefined;
  const showRing = !!ring && !frame;
  const gap = showRing ? ringWidth[size] + 2 : 0;
  const outer = d + gap * 2;
  const showLevel = level !== undefined && (size === 'lg' || size === 'xl');

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name}'s avatar${level !== undefined ? `, level ${level}` : ''}`}
      className={cn('items-center justify-center', className)}
      style={{ width: outer, height: outer }}
    >
      {showRing ? (
        <View
          className="absolute inset-0 rounded-full"
          style={{ borderWidth: ringWidth[size], borderColor: ringColor(ring) }}
        />
      ) : null}
      <View
        className="items-center justify-center overflow-hidden rounded-full bg-surface-raised"
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
      {frame?.kind === 'image' ? (
        <Image
          source={frame.source}
          className="absolute inset-0"
          style={{ width: outer, height: outer }}
        />
      ) : frame?.kind === 'component' ? (
        <View className="absolute inset-0">
          <frame.Component size={outer} />
        </View>
      ) : null}
      {showLevel ? (
        <View className="absolute -bottom-1 self-center rounded-sm border-2 border-background bg-text px-xs">
          <Text variant="overline" tone="inverse" numeric>
            {level}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

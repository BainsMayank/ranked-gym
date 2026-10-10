import { Image, View } from 'react-native';

import { Text } from '../Text';
import { leagueArt, type LeagueDivision } from './artRegistry';

export interface LeagueBadgeProps {
  division: LeagueDivision;
  size?: number;
  showLabel?: boolean;
}

/** Distinct weekly-league identity; strength-rank divisions remain on RankBadge. */
export function LeagueBadge({ division, size = 64, showLabel = false }: LeagueBadgeProps) {
  const art = leagueArt[division];
  const label = division.charAt(0).toUpperCase() + division.slice(1);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label} league`}
      className="items-center gap-xs"
    >
      {art.kind === 'image' ? (
        <Image
          source={art.source}
          style={{ width: size, height: size }}
          resizeMode="contain"
          resizeMethod="resize"
        />
      ) : (
        <art.Component size={size} />
      )}
      {showLabel ? <Text variant="label">{label}</Text> : null}
    </View>
  );
}

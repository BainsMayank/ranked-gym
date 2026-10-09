import { View } from 'react-native';

import { cn } from '@/lib/utils';
import { DIVISIONS, rankLabel, romanDivision, type RankDivision } from '@/lib/game/ranks';
import { rankColors, useTheme, type RankTier } from '@/theme';

import { Text } from '../Text';

export interface DivisionLadderProps {
  tier: RankTier;
  division: RankDivision;
  /** Progress through the current division, 0 → 1. */
  progress: number;
  /** Fill with the tier colour instead of the orange signal colour. */
  tierColored?: boolean;
  showLabels?: boolean;
  className?: string;
}

const NOTCH_HEIGHT = 6;

/**
 * Signature rank progress: one notch per division (III → I), filled up to the current point.
 * Champion has no divisions: use ProgressBar with points instead.
 */
export function DivisionLadder({
  tier,
  division,
  progress,
  tierColored = false,
  showLabels = true,
  className,
}: DivisionLadderProps) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const currentIndex = DIVISIONS.indexOf(division);
  const fill = tierColored ? rankColors[tier].base : colors.primary;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${rankLabel(tier, division)} progress`}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clamped * 100),
        text: `${Math.round(clamped * 100)}% through ${rankLabel(tier, division)}`,
      }}
      className={cn('gap-xs', className)}
    >
      <View className="flex-row gap-xs">
        {DIVISIONS.map((d, i) => {
          const share = i < currentIndex ? 1 : i === currentIndex ? clamped : 0;
          return (
            <View
              key={d}
              className="flex-1 overflow-hidden bg-surface-raised"
              style={{ height: NOTCH_HEIGHT }}
            >
              <View
                style={{ width: `${share * 100}%`, height: NOTCH_HEIGHT, backgroundColor: fill }}
              />
            </View>
          );
        })}
      </View>
      {showLabels ? (
        <View className="flex-row">
          {DIVISIONS.map((d) => (
            <Text
              key={d}
              variant="overline"
              tone={d === division ? 'default' : 'muted'}
              className="flex-1"
            >
              {romanDivision(d)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

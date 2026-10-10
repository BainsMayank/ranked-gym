import { View } from 'react-native';

import { DonutChart, LeagueBadge, RankBadge, RankTag, Text } from '@/components';
import { leagueDivisions } from '@/lib/leagues/types';
import type { GoalMilestone, LeagueMilestone, PrMilestone, RankUpMilestone } from '@/lib/social';
import type { WeightUnit } from '@/lib/units';
import { useTheme } from '@/theme';

import { prKindLabel, prValueText } from '../format';

/** The celebratory part of each milestone post: one big game object, then plain text. */

export function PrBody({ pr, unit }: { pr: PrMilestone; unit: WeightUnit }) {
  return (
    <View className="gap-xs">
      <Text variant="overline" tone="success">
        New PR · {prKindLabel(pr.kind)}
      </Text>
      <Text variant="display" numeric>
        {prValueText(pr, pr.value, unit)}
      </Text>
      <Text variant="subheading" numberOfLines={2}>
        {pr.exerciseName}
      </Text>
      {pr.previousValue !== null ? (
        <Text variant="caption" tone="muted" numeric>
          Was {prValueText(pr, pr.previousValue, unit)}
        </Text>
      ) : null}
    </View>
  );
}

export function RankUpBody({ rankUp }: { rankUp: RankUpMilestone }) {
  const what = rankUp.scope === 'overall' ? 'Overall rank' : rankUp.name;
  return (
    <View className="flex-row items-center gap-lg">
      <RankBadge tier={rankUp.rank.tier} division={rankUp.rank.division} size={72} />
      <View className="flex-1 gap-xxs">
        <Text variant="overline" tone="muted">
          Ranked up
        </Text>
        <RankTag tier={rankUp.rank.tier} division={rankUp.rank.division} size="md" />
        <Text variant="label" numberOfLines={2}>
          {what}
        </Text>
        {rankUp.from ? (
          <Text variant="caption" tone="muted">
            Up from <RankTag tier={rankUp.from.tier} division={rankUp.from.division} />
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function GoalBody({ goal }: { goal: GoalMilestone }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center gap-lg">
      <DonutChart
        slices={[{ key: 'done', value: 1, color: colors.success }]}
        size={64}
        thickness={8}
        accessibilityLabel="Goal complete"
      >
        <Text variant="label" tone="success">
          Done
        </Text>
      </DonutChart>
      <View className="flex-1 gap-xxs">
        <Text variant="overline" tone="muted">
          Goal achieved
        </Text>
        <Text variant="subheading" numberOfLines={3}>
          {goal.title}
        </Text>
      </View>
    </View>
  );
}

const outcomeWords = {
  promoted: 'Promoted',
  stayed: 'Held their place',
  demoted: 'Moved down',
} as const;

export function LeagueBody({ league }: { league: LeagueMilestone }) {
  const division = leagueDivisions.find((d) => d === league.division);
  return (
    <View className="flex-row items-center gap-lg">
      {division ? <LeagueBadge division={division} size={64} /> : null}
      <View className="flex-1 gap-xxs">
        <Text variant="overline" tone="muted">
          League result
        </Text>
        <Text variant="subheading" numberOfLines={2}>
          {league.place !== null ? `#${league.place} in ${league.name}` : league.name}
        </Text>
        <Text variant="caption" tone="muted" numeric>
          {[
            league.outcome ? outcomeWords[league.outcome] : null,
            league.points !== null ? `${league.points} LP` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </View>
  );
}

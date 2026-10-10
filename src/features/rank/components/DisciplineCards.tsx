import { View } from 'react-native';

import { ProgressBar, RankTag, Text } from '@/components';
import { ladderPosition, type CurrentRank, type RankLadder } from '@/lib/ranks';

import { formatScore } from '../format';

export interface DisciplineCardsProps {
  weightlifting: CurrentRank | null;
  calisthenics: CurrentRank | null;
  ladder: RankLadder | undefined;
  /** Score change over the last month, by discipline (Analysis). */
  deltas?: { weightlifting: number | null; calisthenics: number | null };
}

const NAMES = { weightlifting: 'Weightlifting', calisthenics: 'Calisthenics' } as const;

/** Weightlifting and calisthenics ranks side by side. With `deltas` it adds score and progress. */
export function DisciplineCards({
  weightlifting,
  calisthenics,
  ladder,
  deltas,
}: DisciplineCardsProps) {
  return (
    <View className="flex-row gap-sm">
      {(['weightlifting', 'calisthenics'] as const).map((key) => {
        const row = key === 'weightlifting' ? weightlifting : calisthenics;
        return (
          <DisciplineCard
            key={key}
            name={NAMES[key]}
            row={row}
            ladder={ladder}
            delta={deltas?.[key]}
            detailed={!!deltas}
          />
        );
      })}
    </View>
  );
}

function DisciplineCard({
  name,
  row,
  ladder,
  delta,
  detailed,
}: {
  name: string;
  row: CurrentRank | null;
  ladder: RankLadder | undefined;
  delta: number | null | undefined;
  detailed: boolean;
}) {
  const ranked = row?.status === 'ranked' && row.rank && row.score !== null;
  const progress =
    ranked && ladder && row.score !== null ? ladderPosition(row.score, ladder).progress : 0;
  let meta: string;
  if (ranked && row.score !== null) {
    const change = delta ? ` · ${delta > 0 ? '+' : ''}${Math.round(delta)} this month` : '';
    meta = detailed
      ? `Score ${formatScore(row.score)}${change}`
      : `${row.details?.lifts ?? 0} lifts ranked`;
  } else if (row?.details) {
    meta = `Placement · ${row.details.lifts}/${row.details.needLifts} lifts`;
  } else {
    meta = name === 'Calisthenics' ? 'Log a pull-up or dip to rank' : 'Log a barbell lift to rank';
  }

  return (
    <View
      accessible
      accessibilityLabel={`${name}: ${ranked && row.rank ? `${row.rank.tier} ${row.rank.division ?? ''}` : 'not ranked'}. ${meta}`}
      className="flex-1 gap-xs rounded-lg border-t border-edge bg-surface p-lg"
    >
      <Text variant="caption" tone="muted">
        {name}
      </Text>
      {ranked && row.rank ? (
        <RankTag tier={row.rank.tier} division={row.rank.division} size="md" />
      ) : (
        <Text variant="subheading" tone="muted">
          Unranked
        </Text>
      )}
      {detailed && ranked && row.rank ? (
        <ProgressBar
          progress={progress}
          rankTier={row.rank.tier}
          height={4}
          accessibilityLabel={`${name} progress`}
        />
      ) : null}
      <Text variant="caption" tone="muted" numeric>
        {meta}
      </Text>
    </View>
  );
}

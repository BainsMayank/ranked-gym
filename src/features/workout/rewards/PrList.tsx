import { Icon, ListGroup, ListItem } from '@/components';
import { prLabel, prValue, type PersonalRecord } from '@/lib/ranks';
import type { WeightUnit } from '@/lib/units';

interface PrListProps {
  prs: readonly PersonalRecord[];
  unit: WeightUnit;
}

/** Each record this workout set: what, on which exercise, now vs before. */
export function PrList({ prs, unit }: PrListProps) {
  if (prs.length === 0) return null;
  return (
    <ListGroup>
      {prs.map((pr) => {
        const { now, before } = prValue(pr, unit);
        return (
          <ListItem
            key={`${pr.exerciseId}:${pr.kind}:${pr.weightKg ?? ''}`}
            title={prLabel(pr, unit)}
            subtitle={`${pr.exerciseName} · was ${before}`}
            value={now}
            leading={<Icon name="trophy" size={18} tone="streak" />}
          />
        );
      })}
    </ListGroup>
  );
}

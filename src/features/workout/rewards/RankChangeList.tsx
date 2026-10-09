import { Icon, ListGroup, ListItem, RankTag } from '@/components';
import { rankLabel } from '@/lib/game/ranks';
import { changeName, sortChanges, type RankChange } from '@/lib/ranks';

interface RankChangeListProps {
  changes: readonly RankChange[];
  /** Shown as the reveal above, so not repeated. */
  skip?: RankChange | null;
}

/** How many rows before the muscle changes fold into one line. */
const MAX_ROWS = 6;

function subtitle(change: RankChange): string {
  if (change.kind === 'placed') return 'First rank';
  const from = change.from ? rankLabel(change.from.tier, change.from.division) : '';
  return change.kind === 'rank_up' ? `Up from ${from}` : `Down from ${from}`;
}

/** Every rank that moved: overall and disciplines first, then lifts and regions, muscles last. */
export function RankChangeList({ changes, skip }: RankChangeListProps) {
  const rest = sortChanges(changes).filter(
    (c) => !(skip && c.scope === skip.scope && c.key === skip.key),
  );
  const main = rest.filter((c) => c.scope !== 'muscle');
  const muscles = rest.filter((c) => c.scope === 'muscle');
  const shown = main.slice(0, MAX_ROWS);
  const hidden = main.length - shown.length + muscles.length;
  if (shown.length === 0 && hidden === 0) return null;

  return (
    <ListGroup>
      {shown.map((c) => (
        <ListItem
          key={`${c.scope}:${c.key}`}
          title={changeName(c)}
          subtitle={subtitle(c)}
          leading={
            <Icon
              name={c.kind === 'rank_down' ? 'arrow-down' : 'arrow-up'}
              size={18}
              tone={c.kind === 'rank_down' ? 'textMuted' : 'success'}
            />
          }
          trailing={<RankTag tier={c.to.tier} division={c.to.division} />}
        />
      ))}
      {hidden > 0 ? (
        <ListItem
          title={`${hidden} more ${hidden === 1 ? 'rank' : 'ranks'} moved`}
          subtitle={muscles.length > 0 ? 'Muscle ranks show on the Body map.' : undefined}
        />
      ) : null}
    </ListGroup>
  );
}

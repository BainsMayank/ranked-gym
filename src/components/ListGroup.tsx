import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/utils';

export interface ListGroupProps {
  children: ReactNode;
  /** Inset the hairlines to line up with row text (default) or run them edge to edge. */
  inset?: boolean;
  className?: string;
}

/** Groups rows on one surface with hairline separators: the default way to show a list. */
export function ListGroup({ children, inset = true, className }: ListGroupProps) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className={cn('overflow-hidden rounded-lg border-t border-edge bg-surface', className)}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View className={cn('h-px bg-border', inset && 'mx-lg')} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

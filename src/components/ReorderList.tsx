import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';

import { Icon } from './Icon';

export interface ReorderListProps<T> {
  data: readonly T[];
  keyExtractor: (item: T) => string;
  /** Every row has this height (compact rows make dragging predictable). */
  rowHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  /** Rows that can't be dragged still move aside for the ones that can. */
  isDraggable?: (item: T) => boolean;
  /** Nothing can move above this index (e.g. a fixed first header). */
  minIndex?: number;
  /** Screen-reader name of a row, e.g. "Barbell back squat". */
  itemLabel: (item: T) => string;
  onReorder: (from: number, to: number) => void;
}

type Positions = Record<string, number>;

function positionsOf(keys: readonly string[]): Positions {
  const out: Positions = {};
  keys.forEach((k, i) => (out[k] = i));
  return out;
}

function moveKey(positions: Positions, key: string, from: number, to: number): Positions {
  'worklet';
  const next: Positions = {};
  for (const k in positions) {
    const p = positions[k]!;
    if (k === key) next[k] = to;
    else if (from < to && p > from && p <= to) next[k] = p - 1;
    else if (from > to && p >= to && p < from) next[k] = p + 1;
    else next[k] = p;
  }
  return next;
}

const SPRING = { damping: 24, stiffness: 260 };

interface RowProps {
  id: string;
  index: number;
  count: number;
  rowHeight: number;
  minIndex: number;
  draggable: boolean;
  label: string;
  positions: SharedValue<Positions>;
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
}

function ReorderRow({
  id,
  index,
  count,
  rowHeight,
  minIndex,
  draggable,
  label,
  positions,
  onReorder,
  children,
}: RowProps) {
  const reducedMotion = useReducedMotion();
  const top = useSharedValue(index * rowHeight);
  const dragging = useSharedValue(false);
  const start = useSharedValue(index);

  useAnimatedReaction(
    () => positions.get()[id] ?? index,
    (pos, prev) => {
      if (pos === prev || dragging.get()) return;
      top.set(reducedMotion ? pos * rowHeight : withSpring(pos * rowHeight, SPRING));
    },
  );

  const pan = Gesture.Pan()
    .enabled(draggable)
    .minDistance(0)
    .onStart(() => {
      dragging.set(true);
      start.set(positions.get()[id] ?? index);
      scheduleOnRN(haptics.selection);
    })
    .onUpdate((e) => {
      const y = start.get() * rowHeight + e.translationY;
      top.set(Math.max(minIndex * rowHeight, Math.min((count - 1) * rowHeight, y)));
      const from = positions.get()[id] ?? index;
      const to = Math.max(minIndex, Math.min(count - 1, Math.round(y / rowHeight)));
      if (to !== from) {
        positions.set(moveKey(positions.get(), id, from, to));
        scheduleOnRN(haptics.selection);
      }
    })
    .onFinalize(() => {
      if (!dragging.get()) return;
      const to = positions.get()[id] ?? index;
      top.set(withSpring(to * rowHeight, SPRING));
      dragging.set(false);
      if (to !== start.get()) scheduleOnRN(onReorder, start.get(), to);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: top.get() }, { scale: dragging.get() ? 1.02 : 1 }],
    zIndex: dragging.get() ? 10 : 0,
  }));

  const actions = draggable
    ? [
        ...(index > minIndex ? [{ name: 'moveUp', label: 'Move up' }] : []),
        ...(index < count - 1 ? [{ name: 'moveDown', label: 'Move down' }] : []),
      ]
    : undefined;

  return (
    <Animated.View
      style={[{ position: 'absolute', left: 0, right: 0, height: rowHeight }, style]}
      accessible
      accessibilityLabel={label}
      accessibilityHint={draggable ? 'Swipe up or down with one finger to move it' : undefined}
      accessibilityActions={actions}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'moveUp') onReorder(index, index - 1);
        if (e.nativeEvent.actionName === 'moveDown') onReorder(index, index + 1);
      }}
    >
      <View className="flex-1 flex-row items-center">
        <View className="flex-1">{children}</View>
        {draggable ? (
          <GestureDetector gesture={pan}>
            <View
              className="h-full w-12 items-center justify-center"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Icon name="reorder-two" size={22} tone="textMuted" />
            </View>
          </GestureDetector>
        ) : null}
      </View>
    </Animated.View>
  );
}

/**
 * A short list of fixed-height rows reordered by dragging the handle on the right. Screen readers
 * get Move up / Move down actions instead. Used for reorder modes (exercises, routines, folders);
 * keep it to a few dozen rows (it does not virtualise or auto-scroll).
 */
export function ReorderList<T>({
  data,
  keyExtractor,
  rowHeight,
  renderItem,
  isDraggable,
  minIndex = 0,
  itemLabel,
  onReorder,
}: ReorderListProps<T>) {
  const keys = data.map(keyExtractor);
  const positions = useSharedValue<Positions>(positionsOf(keys));
  const signature = keys.join('|');

  useEffect(() => {
    positions.set(positionsOf(signature.split('|')));
  }, [signature, positions]);

  return (
    <View style={{ height: data.length * rowHeight }}>
      {data.map((item, i) => (
        <ReorderRow
          key={keys[i]}
          id={keys[i]!}
          index={i}
          count={data.length}
          rowHeight={rowHeight}
          minIndex={minIndex}
          draggable={isDraggable ? isDraggable(item) : true}
          label={itemLabel(item)}
          positions={positions}
          onReorder={onReorder}
        >
          {renderItem(item, i)}
        </ReorderRow>
      ))}
    </View>
  );
}

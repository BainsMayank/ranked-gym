import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans';
import { Circle, Group, Rect, Text as SkiaText, useFont } from '@shopify/react-native-skia';
import { View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import { typography, useTheme } from '@/theme';

export interface LinePoint {
  x: number;
  y: number;
}

export interface LineMarker {
  x: number;
  y: number;
  color: string;
}

export interface LineBand {
  from: number;
  to: number;
  color: string;
  label?: string;
}

export interface LineChartProps {
  data: LinePoint[];
  /** Line colour (defaults to the signal colour). */
  color?: string;
  /** Dots drawn on the line (rank-up days). */
  markers?: LineMarker[];
  /** Horizontal bands behind the line (tier ranges), tinted with their colour. */
  bands?: LineBand[];
  yDomain?: [number, number];
  height?: number;
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
  /** Required: a sentence describing the trend for screen readers. */
  accessibilityLabel: string;
}

const LABEL_SIZE = typography.caption.fontSize;

/** Line chart on Victory Native (Skia): optional tier bands behind and markers on the line. */
export function LineChart({
  data,
  color,
  markers = [],
  bands = [],
  yDomain,
  height = 180,
  formatX,
  formatY,
  accessibilityLabel,
}: LineChartProps) {
  const { colors } = useTheme();
  const font = useFont(InstrumentSans_400Regular, LABEL_SIZE);
  const stroke = color ?? colors.primary;

  return (
    <View
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <CartesianChart
        data={data.map(({ x, y }) => ({ x, y }))}
        xKey="x"
        yKeys={['y']}
        domain={yDomain ? { y: yDomain } : undefined}
        domainPadding={{ top: 8, bottom: 4, left: 6, right: 6 }}
        xAxis={{
          font,
          tickCount: 4,
          labelColor: colors.textMuted,
          lineColor: colors.border,
          lineWidth: 0,
          formatXLabel: (v) => (formatX ? formatX(Number(v)) : String(v)),
        }}
        yAxis={[
          {
            font,
            tickCount: 4,
            labelColor: colors.textMuted,
            lineColor: colors.border,
            lineWidth: 0.5,
            formatYLabel: (v) => (formatY ? formatY(Number(v)) : String(Math.round(Number(v)))),
          },
        ]}
        frame={{ lineWidth: 0 }}
      >
        {({ points, chartBounds, xScale, yScale }) => (
          <>
            {bands.map((b) => {
              const top = yScale(b.to);
              const bottom = yScale(b.from);
              return (
                <Rect
                  key={`${b.from}-${b.to}`}
                  x={chartBounds.left}
                  y={top}
                  width={chartBounds.right - chartBounds.left}
                  height={Math.max(0, bottom - top)}
                  color={b.color}
                  opacity={0.1}
                />
              );
            })}
            {font
              ? bands.map((b) =>
                  b.label ? (
                    <SkiaText
                      key={`label-${b.from}`}
                      x={chartBounds.left + 6}
                      y={yScale(b.to) + LABEL_SIZE + 3}
                      text={b.label}
                      font={font}
                      color={b.color}
                    />
                  ) : null,
                )
              : null}
            <Line points={points.y} color={stroke} strokeWidth={2.5} curveType="monotoneX" />
            {markers.map((m) => (
              <Group key={`${m.x}-${m.y}`}>
                <Circle cx={xScale(m.x)} cy={yScale(m.y)} r={4.5} color={m.color} />
                <Circle
                  cx={xScale(m.x)}
                  cy={yScale(m.y)}
                  r={4.5}
                  color={colors.surface}
                  style="stroke"
                  strokeWidth={1.5}
                />
              </Group>
            ))}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme, type ColorToken } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  tone?: ColorToken;
  /** Raw colour override (e.g. a rank colour from tokens). */
  color?: ColorValue;
}

/** Decorative icon: hidden from screen readers — the touchable around it carries the label. */
export function Icon({ name, size = 22, tone = 'text', color }: IconProps) {
  const { colors } = useTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color ?? colors[tone]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

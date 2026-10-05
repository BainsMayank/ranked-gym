import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';

import { Text } from './Text';

export interface ScreenProps {
  children: ReactNode;
  /** Large title rendered at the top of the screen. */
  title?: string;
  /** Element shown to the right of the title (e.g. an IconButton). */
  headerRight?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Safe-area edges to inset. Defaults to top; the tab bar handles the bottom. */
  edges?: Edge[];
  className?: string;
}

export function Screen({
  children,
  title,
  headerRight,
  scroll = false,
  padded = true,
  edges = ['top'],
  className,
}: ScreenProps) {
  const header = title ? (
    <View className={cn('flex-row items-center justify-between pb-md pt-sm', !padded && 'px-lg')}>
      <Text variant="title">{title}</Text>
      {headerRight}
    </View>
  ) : null;

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={cn('pb-xxl', padded && 'px-lg', className)}
          keyboardShouldPersistTaps="handled"
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View className={cn('flex-1', padded && 'px-lg', className)}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

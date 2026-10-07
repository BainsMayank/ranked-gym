import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface ScreenProps {
  children: ReactNode;
  /** Title rendered at the top of the screen. */
  title?: string;
  /** Small line under or beside the title (e.g. "38 friends · 6 active now"). */
  subtitle?: string;
  /** Element shown to the right of the title (e.g. IconButtons, a chip). */
  headerRight?: ReactNode;
  /** Shows a back button before the title. */
  onBack?: () => void;
  /** Pinned to the bottom, above the tab bar (a summary + main action, or a "You" row). */
  footer?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /**
   * Keeps focused inputs and the footer above the keyboard (forms). On Android the window already
   * makes room, so only iOS pads.
   */
  avoidKeyboard?: boolean;
  /** Safe-area edges to inset. Defaults to top; inside tabs the content is padded past the glass tab bar. */
  edges?: Edge[];
  className?: string;
}

export function Screen({
  children,
  title,
  subtitle,
  headerRight,
  onBack,
  footer,
  scroll = false,
  padded = true,
  edges = ['top'],
  avoidKeyboard = false,
  className,
}: ScreenProps) {
  // The tab bar floats over content (glass), so pad by its height. Undefined outside the tab navigator.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const bottomInset = footer ? 0 : tabBarHeight;

  const header =
    title || onBack ? (
      <View className={cn('flex-row items-center gap-sm pb-lg pt-sm', !padded && 'px-lg')}>
        {onBack ? (
          <IconButton
            icon="chevron-back"
            accessibilityLabel="Back"
            variant="surface"
            onPress={onBack}
          />
        ) : null}
        <View className="flex-1">
          {title ? <Text variant={onBack ? 'heading' : 'title'}>{title}</Text> : null}
          {subtitle ? (
            <Text variant="caption" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {headerRight}
      </View>
    ) : null;

  return (
    <SafeAreaView
      edges={edges}
      className="flex-1 bg-background"
      style={{ paddingBottom: footer ? tabBarHeight : 0 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled={avoidKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName={cn(padded && 'px-lg', className)}
            contentContainerStyle={{ paddingBottom: bottomInset + 32 }}
            scrollIndicatorInsets={{ bottom: bottomInset }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {header}
            {children}
          </ScrollView>
        ) : (
          <View
            className={cn('flex-1', padded && 'px-lg', className)}
            style={{ paddingBottom: bottomInset }}
          >
            {header}
            {children}
          </View>
        )}
        {footer ? (
          <View className="border-t border-border bg-background px-lg pb-md pt-md">{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

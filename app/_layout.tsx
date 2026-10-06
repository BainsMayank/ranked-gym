import '../global.css';

import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  useFonts,
} from '@expo-google-fonts/instrument-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  Stack,
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
  SplashScreen,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/queryClient';
import { fontFamilies, ThemeProvider, useTheme } from '@/theme';

// Keep the splash up until the brand font is ready, so text never flashes in the system font.
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { scheme, colors } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fontFamilies.medium },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="plan/new" options={{ headerShown: false }} />
        <Stack.Screen name="routine/[id]" options={{ headerShown: false }} />
        {/* Slides up like a modal but stays a card screen, so safe-area insets work. */}
        <Stack.Screen
          name="session"
          options={{ headerShown: false, animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="dev/components"
          options={{ title: 'Components', headerBackTitle: 'Back' }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // If the font fails to load we still boot (text falls back to the system font).
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

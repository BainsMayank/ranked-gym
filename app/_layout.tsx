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
import { useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components';
import { useAuthBootstrap, useAuthStore } from '@/lib/auth';
import { useAuthGate, type GateScreen } from '@/lib/auth/useAuthGate';
import { queryClient } from '@/lib/queryClient';
import { fontFamilies, ThemeProvider, useTheme } from '@/theme';

// Keep the splash up until the brand font is ready, so text never flashes in the system font.
void SplashScreen.preventAutoHideAsync();

function RootNavigator({ screen }: { screen: GateScreen }) {
  const { scheme, colors } = useTheme();
  const signedIn = useAuthStore((s) => s.status === 'signedIn' || s.preview);

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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />

        {/* Auth gate: each group is reachable only in its state; anything else falls back to index. */}
        <Stack.Protected guard={screen === 'auth'}>
          <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={screen === 'onboarding'}>
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        {/* Shown right after onboarding finishes, so it can't sit inside the onboarding guard. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen
            name="ready"
            options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
          />
        </Stack.Protected>
        <Stack.Protected guard={screen === 'app'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="plan/new" options={{ headerShown: false }} />
          <Stack.Screen name="plan/preview" options={{ headerShown: false }} />
          <Stack.Screen name="plan/index" options={{ headerShown: false }} />
          <Stack.Screen name="plan/why" options={{ headerShown: false }} />
          <Stack.Screen name="plan/day/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="routine/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="routines/reorder" options={{ headerShown: false }} />
          <Stack.Screen name="routines/templates" options={{ headerShown: false }} />
          {/* Slides up like a modal but stays a card screen, so safe-area insets work. */}
          <Stack.Screen
            name="session/index"
            options={{ headerShown: false, animation: 'slide_from_bottom', gestureEnabled: false }}
          />
          <Stack.Screen name="session/finish" options={{ headerShown: false }} />
          <Stack.Screen
            name="session/rewards"
            options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="workout/generate"
            options={{ headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="workouts/index" options={{ headerShown: false }} />
          <Stack.Screen name="workouts/[id]/index" options={{ headerShown: false }} />
          <Stack.Screen
            name="workouts/[id]/edit"
            options={{ headerShown: false, animation: 'slide_from_bottom', gestureEnabled: false }}
          />
          <Stack.Screen name="exercises/index" options={{ headerShown: false }} />
          <Stack.Screen
            name="exercises/pick"
            options={{ headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="exercises/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="exercises/new" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen
          name="dev/components"
          options={{ title: 'Components', headerBackTitle: 'Back' }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}

/** Waits for the font, the saved session and (when signed in) the profile before hiding the splash. */
function AppGate({ fontsReady }: { fontsReady: boolean }) {
  useAuthBootstrap();
  const { screen } = useAuthGate();
  // Once booted, keep the navigator mounted: a later 'loading' (profile fetching right after sign-in)
  // just parks on the blank index route until the gate settles.
  const [booted, setBooted] = useState(false);
  if (fontsReady && screen !== 'loading' && !booted) setBooted(true);

  useEffect(() => {
    if (booted) void SplashScreen.hideAsync();
  }, [booted]);

  if (!booted) return null;
  return <RootNavigator screen={screen} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });
  // If the font fails to load we still boot (text falls back to the system font).
  const fontsReady = fontsLoaded || !!fontError;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppGate fontsReady={fontsReady} />
            <ToastHost />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

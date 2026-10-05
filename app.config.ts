import type { ConfigContext, ExpoConfig } from 'expo/config';

import { palette } from './src/theme/tokens.ts';

// APP NAME IS A PLACEHOLDER — see docs/PRODUCT_SPEC.md → Open decisions.
const APP_NAME = 'Ranked Gym';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'ranked-gym',
  scheme: 'rankedgym',
  version: '0.1.0',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: palette.dark.background,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.rankedgym.app',
  },
  android: {
    package: 'com.rankedgym.app',
    adaptiveIcon: {
      backgroundColor: palette.dark.background,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: ['expo-router', 'expo-status-bar', 'expo-sqlite'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  },
});

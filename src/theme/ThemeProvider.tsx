import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import { vars } from 'nativewind';

import { useThemeStore } from './themeStore';
import {
  colorTokenNames,
  cssVarName,
  hexToRgbChannels,
  palette,
  type ColorScheme,
  type Palette,
} from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
}

const ThemeContext = createContext<Theme>({ scheme: 'dark', colors: palette.dark });

const schemeVars: Record<ColorScheme, ReturnType<typeof vars>> = {
  dark: vars(
    Object.fromEntries(
      colorTokenNames.map((t) => [cssVarName(t), hexToRgbChannels(palette.dark[t])]),
    ),
  ),
  light: vars(
    Object.fromEntries(
      colorTokenNames.map((t) => [cssVarName(t), hexToRgbChannels(palette.light[t])]),
    ),
  ),
};

export function useResolvedScheme(): ColorScheme {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  if (mode === 'system') return system === 'light' ? 'light' : 'dark';
  return mode;
}

/** Sets the colour CSS variables for every NativeWind class below it and exposes raw values. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useResolvedScheme();
  const theme = useMemo<Theme>(() => ({ scheme, colors: palette[scheme] }), [scheme]);

  return (
    <ThemeContext.Provider value={theme}>
      <View style={[{ flex: 1 }, schemeVars[scheme]]}>{children}</View>
    </ThemeContext.Provider>
  );
}

/** Raw token values for places classes can't reach: icon colours, SVG fills, navigator options. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

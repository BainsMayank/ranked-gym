// Tailwind loads this through jiti, so requiring the TS token file works.
const {
  colorTokenNames,
  cssVarName,
  rankColors,
  radius,
  spacing,
  typography,
} = require('./src/theme/tokens.ts');

const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

// Semantic colours resolve to CSS vars set by ThemeProvider, so one class works in dark + light.
const semanticColors = Object.fromEntries(
  colorTokenNames.map((t) => [kebab(t), `rgb(var(${cssVarName(t)}) / <alpha-value>)`]),
);

const rank = Object.fromEntries(
  Object.entries(rankColors).map(([tier, c]) => [
    tier,
    { DEFAULT: c.base, highlight: c.highlight, on: c.on },
  ]),
);

const px = (n) => `${n}px`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { ...semanticColors, rank },
      spacing: Object.fromEntries(
        Object.entries(spacing)
          .filter(([k]) => k !== 'none')
          .map(([k, v]) => [k, px(v)]),
      ),
      borderRadius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, px(v)])),
      fontSize: Object.fromEntries(
        Object.entries(typography).map(([k, v]) => [
          k,
          [px(v.fontSize), { lineHeight: px(v.lineHeight), fontWeight: v.fontWeight }],
        ]),
      ),
    },
  },
  plugins: [],
};

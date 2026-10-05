// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

const TAILWIND_PALETTE =
  'white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COLOR_UTILITIES =
  'bg|text|border|ring|fill|stroke|from|via|to|divide|placeholder|shadow|outline|decoration|accent|caret|tint';

const colorMessage =
  'No hard-coded colours outside src/theme. Use a theme class (bg-surface, text-text-muted, bg-rank-gold…) or useTheme().colors / rankColors.';

const noHardCodedColors = [
  {
    selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: colorMessage,
  },
  { selector: 'Literal[value=/^(rgba?|hsla?)\\(/]', message: colorMessage },
  {
    selector: `Literal[value=/(^|\\s|:)(${COLOR_UTILITIES})-(\\[#|\\[rgb|(${TAILWIND_PALETTE})(\\b|-))/]`,
    message: colorMessage,
  },
  {
    selector: `TemplateElement[value.raw=/(^|\\s|:)(${COLOR_UTILITIES})-(\\[#|\\[rgb|(${TAILWIND_PALETTE})(\\b|-))/]`,
    message: colorMessage,
  },
  {
    selector:
      'JSXAttribute[name.name=/^(color|backgroundColor|tintColor|stopColor|fill|stroke|placeholderTextColor|selectionColor)$/] > Literal[value!=/^(none|transparent|currentColor)$/]',
    message: colorMessage,
  },
];

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*', 'node_modules/*', 'expo-env.d.ts'],
  },
  {
    rules: {
      'no-restricted-syntax': ['error', ...noHardCodedColors],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/theme/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);

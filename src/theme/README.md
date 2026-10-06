# src/theme — guide

The final visual identity landed in Phase 0B. The **why** (rules, risks, game layer) is in [MOBILE-DESIGN.md](../../MOBILE-DESIGN.md); this file is the **how**. The system is still built so values can change without rewriting components or screens.

## How it fits together

```
tokens.ts ──► tailwind.config.js   semantic classes (bg-surface, text-text-muted, p-lg, text-heading, rounded-md…)
          ├─► displayColor.ts      Expo Go (iOS) P3 correction → palette, rankColors, rarityColors exported by '@/theme'
          │     └─► ThemeProvider  sets --color-* CSS vars for the active scheme (NativeWind vars())
          ├─► useTheme()           raw values for icons, SVG, navigators, Reanimated styles
          └─► app.config.ts        splash / adaptive-icon background
themeStore.ts                      mode: dark | light | system (default dark)
```

Components and screens only reference **token keys**: class names or `colors.<key>`. They never reference raw values. ESLint fails on hard-coded colours outside this folder.

Always import colours from `@/theme`, never from `./tokens` directly: `@/theme` re-exports them through `displayColor.ts`, which fixes Expo Go on iOS reading hex as Display P3 (it made every colour look neon). Tailwind's static `bg-rank-*` classes skip that correction, so use `rankColors` in `style` for rank colours.

## Changing the look

1. **Colours**: edit the values in `palette.dark`, `palette.light` and `rankColors` in `tokens.ts`. Keep hex `#RRGGBB` (the CSS-var conversion and the token test expect it). Check the text/background contrast is at least 4.5:1 for `text`, `textMuted`, `onPrimary` and `onDanger`.
2. **Type**: edit `typography` (size, line height, `weight`, letter spacing, uppercase). The font is Instrument Sans from `@expo-google-fonts/instrument-sans`, loaded in `app/_layout.tsx` before the splash hides. `Text` applies the family per weight from `fontFamilies` (each weight is its own family on Android, so never set `fontWeight` with it). To swap the font, change the package, the `useFonts` call and `fontFamilies`.
3. **Spacing, radius and shadows**: edit `spacing`, `radius` and `shadows`. Class names stay the same.
4. **Adding a colour token**: add it to `colorTokenNames` and both palettes. Tailwind, ThemeProvider and the tests pick it up automatically (class name is kebab-case, e.g. `surfaceSunken` → `bg-surface-sunken`).
5. **Renaming or removing a token key**: this is a breaking change. Search for the key (`colors.<key>`, `-<kebab-key>` classes) and update all usages in the same change.
6. **Verify**: open `/dev/components` (Profile → Component gallery) in dark and light, then run `pnpm check`.

## Visual decisions that live in components (restyle there)

| Component                          | Choice                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PressableScale`                   | Shared spring press feedback (`motion.press`); opacity under reduced motion. Use it for new touchables.                                                |
| `Button`                           | heights 36/48/56, `rounded-md`. `primary` inverted (`bg-text`), `accent` orange, `secondary`, `ghost`, `destructive`                                   |
| `IconButton`                       | circular 36/44/56; `primary` inverted                                                                                                                  |
| `Card`                             | `rounded-lg`, borderless, `border-t border-edge`, `shadows.sm` (`md` when raised)                                                                      |
| `Chip`                             | pill; selected = inverted (`bg-text`), unselected `bg-surface-raised`; no tint, no border                                                              |
| `TopTabs`                          | hairline base, 2px primary indicator, `label` text                                                                                                     |
| `SegmentedControl`                 | `bg-surface` track, selected segment inverted                                                                                                          |
| `ProgressBar`                      | 6px, rounded-full; `rankTier` for rank colour                                                                                                          |
| `Sheet`                            | top radius `radius.xl`, scrim at 60% opacity, grab handle                                                                                              |
| `EmptyState`                       | 64px icon bubble on `surfaceRaised`, icon in `primary`                                                                                                 |
| `Avatar`                           | optional rank/rarity `ring`, `level` tag (lg/xl), cosmetic `frameId` via `avatarFrameArt`                                                              |
| `game/RankBadge`                   | renders `rankArt` registry art, else `PlaceholderRankArt` shield. Keep the props (`tier`, `division`, `size`, `showLabel`) and the accessibility label |
| `game/DivisionLadder`              | signature rank progress, notches IV → I                                                                                                                |
| `game/RankGlow`                    | the app's one gradient: tier-tinted radial glow behind rank heroes and celebrations                                                                    |
| Tab bar (`app/(tabs)/_layout.tsx`) | absolute, `GlassTabBarBackground` (iOS blur, Android near-opaque surface), Ionicons outline/filled, primary active tint                                |

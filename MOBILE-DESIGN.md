# Ranked Gym — mobile design

Read this before any UI decision. Values live in `src/theme/tokens.ts`; this file records **why**. Approved 2026-10-06 (Phase 0B).

## App read

- **Kind**: ranked fitness app with heavy gamification (ranks, leagues, challenges, streaks, avatars, cosmetics). Launch audience: college students in India.
- **Platforms**: iOS and Android, one unified look; Expo Go during development.
- **Dials**: `DESIGN_EXPRESSION 6` (branded-native) · `MOTION_INTENSITY 5` · `VISUAL_DENSITY 4`.
- **References**: `docs/design/references/` (black + calm burnt orange, soft depth). Layouts come from the Claude Design mockups. Styling comes from these references.
- **Preview**: `docs/design/system-preview.html` (type, palette and a sample Rank screen, dark and light).

## Design system

### The one rule: calm chrome, loud rewards

The interface (backgrounds, text, controls, navigation) is near-black neutrals plus **one** orange signal colour. Saturated colour belongs only to **game objects**: rank tiers, rarities, rewards and celebrations. That way a Gold badge or a legendary frame stands out, because nothing else on screen competes with it.

### Colour

| Role                        | Dark                  | Light                 | Use                                                                                        |
| --------------------------- | --------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `background`                | `#0B0B0C`             | `#F5F5F6`             | Screen                                                                                     |
| `surface` / `surfaceRaised` | `#161618` / `#202023` | `#FFFFFF` / `#EBEBED` | Depth comes from these steps                                                               |
| `edge`                      | `#34343A`             | `#FFFFFF`             | Lit top edge on cards ("light from above")                                                 |
| `text` / `textMuted`        | `#F4F4F5` / `#9B9BA1` | `#0F0F11` / `#5F5F66` |                                                                                            |
| `primary`                   | `#F2662F`             | `#C2491A`             | Signal colour only: progress, active state, links, game CTAs. Never large fills in chrome. |
| `success`                   | `#5BC48A`             | `#1E8A55`             | PRs, gains                                                                                 |
| `warning` = `streak`        | `#FF9F43`             | `#A85D0C`             | Streak flame; a streak at risk is a warning. Separate keys so they can diverge.            |
| `danger`                    | `#E5484D`             | `#C9302C`             | Destructive actions, broken streaks                                                        |

- One neutral grey family (no warm/cool mixing). Saturation is kept under 80%.
- **Rank tiers** (same in both modes, metallic, tuned for black): iron `#7A7A82`, bronze `#B9773F`, silver `#B9C2CE`, gold `#E4B53F`, platinum `#4FC3D9` (ice-cyan, kept apart from success green), diamond `#5E9BFF`, master `#A67CFF`, champion `#F2662F` → `#FFB547` (brand orange with a gold edge).
- **Rarity** reuses rank hues so the game has one colour language: common = iron, rare = diamond, epic = master, legendary = `#FFB547`.
- **Expo Go caveat**: on iOS, Expo Go reads hex colours as Display P3, which makes everything look more saturated. `src/theme/displayColor.ts` corrects this in Expo Go only. React Native's own default is sRGB, so dev and store builds are expected to render the tokens as written. Verify this once we move to dev builds.

### Type

**Instrument Sans** (400, 500, 600) for everything. It's calm and precise, and narrow figures make big numbers sit tight. Nothing heavier than semibold: hierarchy comes from size. Numbers that change (weights, reps, points, ranks) use `numeric` (tabular figures).

| Variant      | Size/line | Weight   | Notes                                           |
| ------------ | --------- | -------- | ----------------------------------------------- |
| `hero`       | 64/68     | semibold | One per screen at most (the rank)               |
| `display`    | 40/46     | semibold |                                                 |
| `title`      | 28/34     | semibold | Screen titles                                   |
| `heading`    | 20/26     | medium   |                                                 |
| `subheading` | 17/22     | medium   | Button labels                                   |
| `body`       | 15/22     | regular  |                                                 |
| `label`      | 13/18     | medium   |                                                 |
| `caption`    | 12/16     | regular  |                                                 |
| `overline`   | 11/14     | medium   | Uppercase, +1.3 tracking. Dates, section labels |

Dynamic Type: text 28pt and larger is capped at 1.3×, body at 1.6×.

### Shape, depth, motion

- **Radius lock**: `sm 6` tags · `md 12` controls and buttons · `lg 20` cards · `xl 28` sheets and bars.
- **Depth**: borderless surfaces, a lighter `edge` on the top border, iOS shadow and Android elevation pairs (`shadows.sm/md/lg`).
- **Glass**: the bottom tab bar only. Content scrolls underneath (`Screen` pads by the tab bar height). iOS uses native blur. Android uses a near-opaque surface (real blur needs a `BlurTargetView` around every scene and is too slow on low-end phones).
- **Gradient budget**: one, `RankGlow`, used only behind rank heroes and celebrations.
- **Motion**: every touchable scales to 0.97 on a spring (`PressableScale`). Durations are 150/240/400. Reduced motion falls back to opacity.
- **Icons**: Ionicons, outline for inactive and filled for active. UI icons stay monochrome; colour lives in game art.
- **Haptics** (when `expo-haptics` lands in Phase 4): selection for steppers and toggles, light impact for a logged set, success notification for PRs and rank-ups. Never on plain taps or navigation.

### Component posture

- **`Button` `primary` is inverted** (white on dark, black on light): the one main action per screen. `accent` (orange fill) is for game moments such as joining a challenge or claiming a reward.
- **Selected state is inverted** for `SegmentedControl` and `Chip`. No tinted pills.
- **Lists are grouped with hairlines**, not stacks of cards. A `Card` is a discrete, often tappable object.
- **The signature element is the division ladder** (`DivisionLadder`): rank progress as notches IV → I, never a generic rounded bar.
- **Avoid**: greeting headers ("Hi, Mayank 👋"), icon-plus-number stat tiles, tinted icon chips on every row, badge confetti, and emoji as icons.
- **Sub-tabs are segmented** (`TopTabs`): a pill track with a sliding inverted segment, matching the mockups.
- **Colour on game objects only**: rank names use `RankTag` (tier colour on text), progress for a rank uses the tier colour, and everything else stays neutral. Neutral data bars use `ProgressBar tone="neutral"`; colour marks exceptions (under target, ready, new PR).
- **One white button per screen.** Repeated row actions (Join, Accept, Connect, Cheer) are `outline` or `secondary`.
- **The signed-in player** is marked with a 2px orange left edge in standings (`LeaderboardRow isYou`).

### Layout from the mockups

Layouts follow `docs/design/mockups/` (15 screens). Deliberate differences from the mockups:

| Mockup                                  | In the app                                                   | Why                           |
| --------------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| Neon lime accent, lime hero and buttons | Calm orange signal, white main button, neutral cards         | Calm chrome, loud rewards     |
| Condensed all-caps titles ("HOME")      | Instrument Sans, sentence case                               | Approved type                 |
| "Good evening, Mayank" greeting         | Removed                                                      | AI tell                       |
| Tinted icon squares, tinted rank pills  | Plain icons; rank as coloured text (`RankTag`)               | Fewer tinted chips            |
| Many coloured bars (lime, blue, purple) | Orange for progress, neutral for data, colour for exceptions | One signal colour             |
| Blue rest timer, green rank hint banner | Neutral card with an orange ring; hint as tier-coloured text | Colour only for game meaning  |
| Rank tiers Bronze → Legend (7)          | Iron → Champion (8), as in tokens                            | Rank model (open decision #3) |
| No Records tab in Rank                  | Records kept as the fifth sub-tab                            | In the spec                   |

## Game layer (gamification-ready)

Everything a ranked, competitive app will need plugs in here without restyling screens:

| Need                                | Where                                            | How it extends                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rank model                          | `src/lib/game/ranks.ts`                          | Divisions, tiers without divisions, labels, ordering/compare. Change the division count here (open decision #3).                                                                |
| Rank icons (final art)              | `src/components/game/artRegistry.ts` → `rankArt` | Register a PNG/WebP per tier (optionally per division) or a component (SVG now; Skia or Lottie once approved). `RankBadge` uses the placeholder shield until art is registered. |
| Avatars                             | `Avatar` (`ring`, `level`, `frameId`)            | Rank or rarity ring, level tag, cosmetic frames from `avatarFrameArt` keyed by server cosmetic id.                                                                              |
| Rarity (badges, cosmetics, rewards) | `rarities` / `rarityColors` in tokens            | Four rarities on the rank hues.                                                                                                                                                 |
| Rank progress                       | `DivisionLadder`, `ProgressBar` (`rankTier`)     | Ladder for tiers with divisions; points bar for Master/Champion.                                                                                                                |
| Celebration and hero moments        | `RankGlow`, `Button` `accent`                    | Tier-coloured glow; orange CTA for game actions.                                                                                                                                |

Rules: game values (ranks, XP, rewards) always come from the server; components only display them. New game art goes through the registry, never hard-coded in screens.

## Risk register

| Risk                          | Gain                           | Cost / mitigation                                                                                                                                                               |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom font (Instrument Sans) | Recognisable, calm identity    | Loaded before the splash hides; falls back to the system font if loading fails.                                                                                                 |
| Inverted white primary button | Calm; orange keeps one meaning | Only one primary per screen.                                                                                                                                                    |
| Glass tab bar                 | Depth the user asked for       | Flagged by the design skill as a common AI habit; kept because content truly scrolls under it. Background swap only; navigator keeps press states and insets. Android fallback. |
| Division ladder               | Rank-native signature          | Custom control: exposes `accessibilityValue` with a text description.                                                                                                           |

**Deferred**: glass on the top sub-tab strip (each page would need its own scroll inset); final rank art (the user will supply it, and the slots are ready); haptics (Phase 4).

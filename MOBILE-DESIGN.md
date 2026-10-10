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
- **Haptics** (`src/lib/haptics.ts`): selection for steppers, toggles and keypad +/- steps, light impact for a ticked set, success for a saved workout and for the rank-up reveal on the workout summary. Never on plain taps or navigation. A finished rest vibrates.

### Component posture

- **`Button` `primary` is inverted** (white on dark, black on light): the one main action per screen. `accent` (orange fill) is for game moments such as joining a challenge or claiming a reward.
- **Selected state is inverted** for `SegmentedControl` and `Chip`. No tinted pills.
- **Lists are grouped with hairlines**, not stacks of cards. A `Card` is a discrete, often tappable object.
- **The signature element is the division ladder** (`DivisionLadder`): rank progress as notches III → I (three per tier), never a generic rounded bar.
- **Avoid**: greeting headers ("Hi, Mayank 👋"), icon-plus-number stat tiles, tinted icon chips on every row, badge confetti, and emoji as icons.
- **Sub-tabs are segmented** (`TopTabs`): a pill track with a sliding inverted segment, matching the mockups.
- **Colour on game objects only**: rank names use `RankTag` (tier colour on text), progress for a rank uses the tier colour, and everything else stays neutral. Neutral data bars use `ProgressBar tone="neutral"`; colour marks exceptions (under target, ready, new PR).
- **One white button per screen.** Repeated row actions (Join, Accept, Connect, Cheer) are `outline` or `secondary`.
- **The signed-in player** is marked with a 2px orange left edge in standings (`LeaderboardRow isYou`).
- **Logging (Phase 4)**: the signature element is the docked numeric keypad (no system keyboard; 56pt keys, the plate calculator one key away). Set rows are 48pt; a done set fills its tick with `success`, a missed set with `danger`; the set "up next" gets an orange ring on its badge. Suggestions (target, last time) are muted text in empty cells. The rest countdown is the one orange ring on screen. Finish is the screen's one white button.
- **Mini bar**: a workout in progress docks a raised bar above the tab bar on every tab (orange dot, name, elapsed, rest); its height joins `useTabBarInset()`.

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

| Need                                | Where                                            | How it extends                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rank model                          | `src/lib/game/ranks.ts`                          | Divisions, tiers without divisions, labels, ordering/compare. Change the division count here (open decision #3).                                                          |
| Rank icons (registered art)         | `src/components/game/artRegistry.ts` → `rankArt` | Original PNG masters with vector division pips are registered for all eight tiers. Individual entries can be replaced with images or components without changing screens. |
| Avatars                             | `Avatar` (`ring`, `level`, `frameId`)            | Rank or rarity ring, level tag, cosmetic frames from `avatarFrameArt` keyed by server cosmetic id.                                                                        |
| Rarity (badges, cosmetics, rewards) | `rarities` / `rarityColors` in tokens            | Four rarities on the rank hues.                                                                                                                                           |
| Rank progress                       | `DivisionLadder`, `ProgressBar` (`rankTier`)     | Ladder for tiers with divisions; points bar for Master/Champion.                                                                                                          |
| Celebration and hero moments        | `RankGlow`, `Button` `accent`                    | Tier-coloured glow; orange CTA for game actions.                                                                                                                          |

Rules: game values (ranks, XP, rewards) always come from the server; components only display them. New game art goes through the registry, never hard-coded in screens.

## Risk register

| Risk                          | Gain                           | Cost / mitigation                                                                                                                                                               |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom font (Instrument Sans) | Recognisable, calm identity    | Loaded before the splash hides; falls back to the system font if loading fails.                                                                                                 |
| Inverted white primary button | Calm; orange keeps one meaning | Only one primary per screen.                                                                                                                                                    |
| Glass tab bar                 | Depth the user asked for       | Flagged by the design skill as a common AI habit; kept because content truly scrolls under it. Background swap only; navigator keeps press states and insets. Android fallback. |
| Division ladder               | Rank-native signature          | Custom control: exposes `accessibilityValue` with a text description.                                                                                                           |

**Artwork update (2026-10-09)**: eight original metal/enamel rank masters and four separate weekly-league emblems are registered in `artRegistry.ts`. Tier palette stays unchanged. Division pips are vector UI, independent of the image. Licensed MIT male/female anatomy contours replace the provisional body shapes; see `assets/body/README.md` for source and canonical mapping. Use the shared `BodyMap` for ranks, volume and recovery; screens provide values and a token-based colour scale.

**Rank tab and leagues (Phase 7)**:

- **Shared visuals**: Rank-tab charts are the shared `LineChart` (Victory Native, tier bands behind the line, a rank-coloured dot per rank-up), `BarChart` (weekday and time of day; the strongest bar in orange) and `DonutChart` (region share in tier colours).
- **Hero and lists**: the overall hero keeps one hero moment (a display-size rank, `RankGlow`, `DivisionLadder`) and becomes a placement card with notches before placement. Lift rows show a tier-coloured progress bar plus a muted "Next: … at …" line.
- **Leagues**: a `LeagueBadge` hero in the league's tier glow (Rookie bronze, Contender gold, Elite platinum, Legend champion). Standings use `LeaderboardRow` with promotion and demotion `ZoneDivider`s. The LP breakdown is a plain list, the Monday result is a one-time sheet, and the chat is a placeholder card.
- **Season frames**: `SeasonFrame` (Elite, Legend) is drawn in SVG and registered in `avatarFrameArt` as `season-elite` and `season-legend`.
- **Signed out**: the dev preview shows a sign-in prompt on every server-backed sub-tab instead of errors.

**Deferred**: glass on the top sub-tab strip (each page would need its own scroll inset); smaller production image derivatives and low-end Android decoding checks.

## Phase 8: Home insights

App Read remains ranked fitness for iOS/Android, unified brand, dials **6 / 5 / 4**. No new palette, typeface or visual tokens. Nav Read: Home → For You → Muscle Analysis / Recovery / Goals / Overview, with normal back to Home; Goals → Create/Edit and Overview → Log bodyweight sheet. Existing tab order and deep links stay intact.

Today is the main action, the four entry cards are destinations, and dense metrics use grouped lists. A small greeting **inside Today** is explicitly requested by the Phase 8 brief; the Home header remains content-first. The shared BodyMap is reused for weighted volume and recovery. Recovery colours use existing semantic tokens plus a text legend and exact percentages; muscle range bands and push/pull/legs distribution extend the base ProgressBar. Goal progress uses the base DonutChart. All controls use the base press feedback and sheets respect reduced motion.

Cached data appears immediately, with explicit offline/sync notices. Account-free development uses local data with a source note. Today shows this week's league division and position (hidden in the signed-out preview). See [Phase 8 review](docs/design/phase8/REVIEW.md) for coverage and device limits.

## Phase 9: Feed, Discover and social

App read and dials unchanged (**6 / 5 / 4**); no new tokens, fonts or one-off colours. Nav read: Home → Feed / Discover (top tabs) → push `post/[id]`, `u/[username]`, `notifications`; `post/new` (composer) and `post/[id]/copy` slide up as card screens with an explicit close; the bell lives in the Home header. Deep links: `/post/:id`, `/u/:username`, `/notifications`.

- **Feed posts are full width, separated by hairlines**, not a stack of cards: author row (rank-ringed avatar, @username, time, visibility icon), then the content, then actions. Text never sits in a card.
- **Milestones are the loud reward**: records, rank-ups, goals and league results sit in a raised `Card` with one game object each (a `display` numeric PR in `success`, the registered `RankBadge` art with `RankTag`, a complete `DonutChart`, a `LeagueBadge`). `RankGlow` appears only behind a rank-up on its own post screen, never in lists.
- **Workout posts**: name, one muted line of totals (duration · volume · sets, not stat tiles), the first three exercises with their best set as a hairline list with `PR` tags, a small front `BodyMap` thumbnail (most-trained muscles in orange) and the workout photo.
- **Respect** is our like: a thumbs-up toggle that turns `primary` when given, with a selection haptic and the base press spring (reduced motion falls back to opacity). Comments and Copy workout (`ghost`) share the row.
- **Discover** keeps the same post rows, with an overline naming why (Same college · Similar rank) and the "People to train with" carousel of small cards (Add friend `outline`, Follow `ghost`). Filters are inverted `Chip`s.
- **One white button per screen** holds: the composer's Post, Copy's Save routine, a profile's Add friend/Accept. Repeated row actions (Accept, Decline, Cancel, Share) are `outline` or `ghost`. The "New posts" pill is the one floating inverted control and only appears when there are new posts.
- **States**: post-shaped skeletons, an `EmptyState` with an action, inline errors with Try again, an offline notice over cached posts, pull to refresh, and a "You're all caught up" hairline divider. Signed-out preview shows the sign-in prompt.
- **Images**: `expo-image` with `recyclingKey` and `cacheKey` = storage path, 4:5 to 1.91:1, up to four per post in a paged row with a "2 / 4" counter on a translucent background chip.

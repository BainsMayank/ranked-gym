# Phase 8 mobile design review

2026-10-09 · mobile-design-review · fix mode requested by the user. Dials 6 / 5 / 4, unified iOS/Android, existing tokens and base components. Prior scope was Phase 7 artwork; category deltas reflect different screen coverage and are not an app-wide improvement claim.

## Regression delta

| Category    | Prior artwork scope | Phase 8 scope |
| ----------- | ------------------- | ------------- |
| Navigation  | A                   | A             |
| Anatomy     | A-                  | A-            |
| Typography  | A-                  | A             |
| Colour      | A                   | A             |
| Surfaces    | A                   | A             |
| States      | B                   | A-            |
| Interaction | A-                  | A-            |
| Forms       | A                   | A-            |
| Performance | A-                  | A             |
| Copy        | A                   | A             |

Resolved prior findings: **003**, Chip's target is now 44pt including hitSlop; **028**, segmented targets are 48pt. New **034–037** and **042** were found and fixed. Prior 029–033 are retained in the baseline, with their original scope and status. No commits were made, following CLAUDE.md.

## Coverage and instruments

Static pass: every built/changed Phase 8 screen, goal and weigh-in flows, Feed milestone strip, Home header and changed base controls. Ran the catalog checklist with `rg` against this project's `app/`, `src/features/home/` and relevant `src/components/` paths (the catalog's root `components/` path does not exist here); every hit is triaged below. Inspected theme, navigation, state cycles, keyboard structure, motion, inputs, list bounds and copy.

Live iOS pass: account-free Expo Go on iPhone 17 Pro / iOS 26.5. Verified fresh Home launch and Workout tab, Muscle Analysis/map and Back, Recovery map/speed persistence, Goals/create/complete/Achieved/archive and celebration, Overview metrics/charts and Log bodyweight sheet. Screenshots and accessibility trees were inspected during the walkthrough. No synthetic weigh-in was saved to the user's device. The software keyboard was not shown by the hardware-keyboard simulator, so keyboard avoidance is not claimed verified. No signed-in acceptance was claimed: the user confirmed they have no account.

First impressions, from rendered screens:

- **Recovery:** My eye goes to the title, then the two body silhouettes. The legend connects the green map to ready status; the speed control is clear below it. Exact values require scrolling, as expected for the muscle list.
- **Create goal:** My eye goes to goal type, then the labelled name field. Selected chips are clear and the Save goal button stays in the safe footer. The date format requires more thought than a picker.
- **Goals/celebration:** I see Active/Achieved/Archived before the cards. Completing a checkbox produces one clear milestone sheet with an explicit Keep going action, and the result appears under Achieved.
- **Overview:** I see the range, then a grouped comparison list. The rows are readable, but reaching charts takes scrolling. The zero-data state is honest about missing weigh-ins and sessions.
- **Muscle Analysis:** I see the title, then range and measure controls above the familiar Phase 7 silhouettes. The named rows explain the map and expose sets, volume and weekly guidance. No-workout values stay at zero.
- **Log bodyweight:** The sheet has one labelled numeric field, a disabled Save action until valid, and an explicit Cancel. The title and underlying Overview make the context clear.

Trunk Test: Home, Muscle Analysis, Recovery, Goals, Create goal, Overview, Log bodyweight and celebration **PASS** in the account-free iOS walkthrough (interiors graded on title, context and Back/close). Edit goal and Feed received a code-reconstructed PASS only; final walkthrough coverage is recorded in PROGRESS.md. A direct detail entry's Back fallback goes Home, inspected in code but not driven as a deep link.

## Findings

- **FINDING-034 [high | states | tell 38] — fixed.** Account-free development Home had no entry cards. Restore its existing preview contract, load actual device workouts using SQLite and label the data source. Device-only goals, weigh-ins and speed persist; ranks/posts remain server-only.
- **FINDING-035 [high | states | tell 38] — fixed.** A cold offline screen could wait on skeletons indefinitely. Shared InsightFrame and Home now show an actionable unavailable state; cached values still render immediately.
- **FINDING-036 [medium | performance | tell 13] — fixed.** Overview truncated records at 50 and sent the user to an unrelated range. FlashList now contains every record in the selected range, with a virtualised header and refresh.
- **FINDING-037 [medium | interaction] — fixed.** Shared Sheet and ProgressBar now respect Reduce Motion; Goals' virtualised list now supports refresh.
- **FINDING-029 [medium | anatomy] — carried forward.** The licensed shared anatomy map has schematic chest/delt/hip subdivisions. Retained deliberately rather than replacing Phase 7 art; exact muscle names and values accompany it.
- **FINDING-038 [medium | states] — open.** League standing is labelled unavailable. The Phase 7 leagues backend is incomplete. Wire the existing chip to authoritative membership/standing when that lands.
- **FINDING-039 [medium | forms] — open.** Custom range and deadline use labelled, validated YYYY-MM-DD inputs. A platform date picker would reduce typing; no new dependency was introduced.
- **FINDING-040 [medium | interaction | tell 35] — open.** Existing sample Feed stories/social actions still await Phase 9 and use older press feedback. The sample section is explicitly labelled; real own-goal milestone posts are distinct.
- **FINDING-041 [polish | anatomy] — open.** The requested 2×2 destination grid uses two-line preview limits. Maximum-font-scale/narrow Android truncation needs device review.
- **FINDING-042 [medium | copy] — fixed.** Zero-duration data auto-scaled the line chart below zero and rounded fractional ticks into duplicate labels. Overview now bounds duration at zero with at least ten minutes of scale.

No palette/type/token names were added. Changes to base components serve existing screens too. Review-only fixes touched four shared control files (20% risk; no reverted fix, governor not exceeded); initial feature construction is not counted as a redesign fix. No navigation restructuring or learned gesture changes occurred.

## Grep triage

No new prose em/en dashes, emoji, inline colours, chrome gradients, magic top inset, JS-thread animation, non-destructive Alert or shadow/elevation mismatch. The sole dash hit is an unused legacy MuscleVolumeCard's numeric range. For You maps at most seven milestones; muscle/recovery lists have 20 fixed muscles, metrics/range controls are bounded, and the complete goal/record lists are virtualised. Feed's own milestone query has a hard limit of 20; its legacy preview is fixed data. One GestureHandlerRootView exists. Labelled base Input handles new fields. Greeting inside Today is an explicit brief override, never a greeting header.

## Scores and limits

Four open scoped mediums subtract 0.5 each: Anatomy, States, Interaction and Forms are **3.5 / A-**, the other six categories are **4.0 / A**. Mean **3.8 → Design A**. Only the Feed press-feedback medium maps to a tell: **3.95 → AI Slop A**. Fixed findings subtract nothing. This is a scoped review, not release certification.

Unverified: authenticated real-workout data, Android widths/back/keyboard/insets, native light mode and font scale, software keyboard submit visibility, VoiceOver/long-list performance, direct deep-link launch and splash/font flash. Expo Go native runtime crashes occurred while editing; a clean server/reopen check is separate from screen design QA and its outcome is recorded in PROGRESS.md. No fixture numbers are presented as the user's workouts.

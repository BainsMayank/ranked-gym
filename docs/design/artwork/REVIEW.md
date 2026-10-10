# Phase 7 artwork review · 2026-10-09

Method: `mobile-design-review` with fixes authorised by the session brief. Commit boundaries were not created because this checkout contains ongoing Phase 7 work. Design commitments: root `MOBILE-DESIGN.md` (also linked from `docs/MOBILE-DESIGN.md`).

## Baseline delta

The prior baseline covers Phase 4, so category changes are **not comparable regression measurements**. Its findings and scores are preserved under `previousReviews` in `design-baseline.json`. This run covers My Ranks, Body Map, Leagues and Analysis, their shared emblem components and the muscle sheet. Records and the rest of the app were not edited in this artwork pass.

- New high findings: inaccurate female glute assignment/cropped outline; sample league and analysis numbers presented as personal data, with no-op event buttons. Both fixed.
- Rank hero changed from the 64pt hero token to the centred 40pt display token to accommodate long tier/division names. Tier-strip highlighting now follows the queried overall rank.
- Scope completion is artwork and anatomy integration. Full Phase 7 acceptance remains pending.

## Evidence and coverage

Static pass: route ownership, shared base components, token usage, accessibility, loading/error/empty states, gesture implementation and all ten rubric categories inspected. The grep checklist was adapted to the actual `src/features/rank`, `src/components/body`, `src/components/game` and `app` paths.

Asset live pass: rendered all four anatomy views, corrected the female view boxes to upstream values and the reversed right gluteal fragment order, then inspected dark/light variants. Inspected all 12 emblems together at hero size and 32/24px on both backgrounds; silhouettes remain distinguishable. Review artifacts: `emblems-review.png`, `anatomy-review.svg`, `preview.html`.

Native screen live pass: the reachable iOS simulator was at the sign-in screen; authenticated Rank screens were not reached. Browser policy blocked `file:` previews; that action was not retried through another browser surface. No native screen screenshots or first-impression claims are made. Asset inspection used raster previews of source vectors and an emblem contact sheet.

| Screen   | Static review                                                                                                                                  | Native narration / Trunk Test          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| My Ranks | Hero, pips, tier strip, comparison, information sheet; skeleton/error added; sample sections labelled                                          | N/A: authenticated screen not rendered |
| Body Map | Source contours, canonical coverage, cosmetic outline toggle, accessible 56pt muscle rows, neutral unranked, loading/error/empty, muscle sheet | N/A: authenticated screen not rendered |
| Leagues  | Distinct Contender emblem, LP terminology, preview label; Phase 12B community mock and no-op event buttons removed from this screen            | N/A: authenticated screen not rendered |
| Analysis | Shared rank art, queried comparison, skeleton/error; sample analysis labelled                                                                  | N/A: authenticated screen not rendered |

Asset impression: my eye goes to the primary symbol before the border. Circles, kites, stars, crystals and wings separate the ranks without relying on colour. The body contours read as anatomy; neutral extremities recede and the coloured muscle regions are easy to scan. This describes the asset boards, not the unrendered native screens.

## Findings

- **FINDING-026 [high | anatomy] — fixed:** the female right glute and abductor fragments were assigned in the opposite order; the initial cropped view box cut off hair. Restored upstream view boxes and corrected the adapter. Re-rendered both outlines to confirm symmetry of assignments.
- **FINDING-027 [high | copy, tell 33] — fixed:** mock personal progression, analysis and league results looked live. Added explicit example-data labels, used real overall rank for the tier strip, and removed dead event buttons/community battle content from the Leagues screen. Weekly leagues remain a preview until backend integration.
- **FINDING-028 [medium | interaction, tell 19] — open:** shared `SegmentedControl` has 40pt targets. Body view and outline controls inherit this. Increase the base component to 44pt and verify all consumers together; this cross-app change is deferred.
- **FINDING-029 [medium | anatomy] — open:** source contours have broad chest/deltoid groups, so canonical subdivisions use schematic clips. The abductor region represents lateral gluteal muscles. Replace only those partitions if a more detailed licensed canonical asset is obtained; current limits are documented, not represented as medical anatomy.
- **FINDING-030 [medium | performance] — open:** 12 full-resolution RGBA masters add about 18 MB to assets. Image views request resize decoding, but decoded memory and scrolling on low-end Android are unverified. Retain masters and generate size-specific production derivatives in a follow-up.
- **FINDING-031 [medium | states] — open:** progression, lift list, most analysis and leagues are explicitly marked previews. They still need the existing Phase 7 query/data work completed. The artwork pass must not be treated as backend completion.
- **FINDING-032 [medium | states] — open:** the muscle sheet shows rank/score and an explanation, but contributing lift scores and the weakest-link recommendation remain Phase 7 work.
- **FINDING-033 [medium | typography] — open:** the existing sample progression chart still has a 10pt SVG label and an obsolete four-division axis. Replace it with the real-data chart and typography tokens; sample labelling currently prevents confusion with personal progress.

Fix order for remaining design work: finish truthful data and chart semantics; enlarge base targets; produce device-size assets and profile memory; refine canonical anatomy partitions if better source art becomes available.

## Scores

Only open findings above enter the calculation. Fixed findings subtract nothing.

| Category    | Numeric | Letter |
| ----------- | ------- | ------ |
| Navigation  | 4.0     | A      |
| Anatomy     | 3.5     | A-     |
| Typography  | 3.5     | A-     |
| Colour      | 4.0     | A      |
| Surfaces    | 4.0     | A      |
| States      | 3.0     | B      |
| Interaction | 3.5     | A-     |
| Forms       | 4.0     | A      |
| Performance | 3.5     | A-     |
| Copy        | 4.0     | A      |

Design: mean **3.7 → A**, no open high in this scoped pass. AI Slop: mean **3.95 → A** (only open tell-mapped finding 028). These scores describe the scoped static/asset review and do not certify complete Phase 7 behavior or native rendering.

## Unverified

Authenticated native layouts, actual pinch/pan and sheet gestures, VoiceOver traversal, Dynamic Type at 1.3×/1.6×, Android widths/edge-to-edge/back behavior, scroll performance and bitmap memory, splash/font loading, and complete weekly/seasonal league cycles. The source-derived maps and emblem boards were inspected in both themes; the app screens themselves were not.

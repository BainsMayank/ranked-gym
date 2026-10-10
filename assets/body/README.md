# Body map artwork

The male/female front/back contours are from [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter), by ELABBASSI Hicham, under the [MIT licence](LICENSE). No attribution payment or proprietary asset subscription is required. Preserve `LICENSE` when redistributing the contours.

- Source revision: `8ed39ac2ae9cb46fb79d77eedec7e5b029a75174`, checked 2026-10-09.
- Source files: `assets/bodyFront.ts`, `bodyBack.ts`, `bodyFemaleFront.ts`, `bodyFemaleBack.ts`; view boxes from `components/SvgMaleWrapper.tsx` and `SvgFemaleWrapper.tsx`.
- Local data: `anatomy.json`. Original SVG contours retained; upstream colours removed. No upstream code executes at runtime and no package dependency was added.
- Import: `rtk proxy node scripts/import-body-art.cjs /path/to/react-native-body-highlighter` from the project root, using the pinned revision. Then run Prettier on the JSON.
- Canonical adapter: `src/components/body/paths.ts`; renderer: `BodyFigure.tsx`; reusable value/colour/press/zoom API: `BodyMap.tsx`.

## Canonical mapping

| Source                                         | App keys                                  | Adaptation                                                                          |
| ---------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| chest                                          | `upper_chest`, `mid_lower_chest`          | Two clips of the original pectoral contour                                          |
| deltoids                                       | `front_delts`, `side_delts`, `rear_delts` | Inner/outer clips; front/back determines anterior/posterior                         |
| biceps, triceps, forearm                       | `biceps`, `triceps`, `forearms`           | Direct                                                                              |
| upper-back                                     | `lats`, `upper_back`                      | Separate original lateral and medial fragments                                      |
| trapezius, lower-back                          | `traps`, `lower_back`                     | Direct                                                                              |
| abs, obliques                                  | `abs`, `obliques`                         | Direct                                                                              |
| quadriceps, hamstring                          | `quads`, `hamstrings`                     | Direct                                                                              |
| gluteal                                        | `glutes`, `abductors`                     | Main glute and upper lateral gluteal fragments; female right fragment order differs |
| adductors, calves                              | `adductors`, `calves`                     | Direct                                                                              |
| neck                                           | `neck`                                    | Optional; neutral and untappable by default                                         |
| head, hair, hands, feet, knees and other parts | neutral                                   | Cosmetic outline only                                                               |

These are schematic training regions, not a medical segmentation. Chest and deltoid subdivisions approximate the app taxonomy; the lateral gluteal fragment represents the hip abductors. Muscles hidden beneath other muscles are not separately visible. Both sexes use the same rank values and standards; the outline toggle is cosmetic. Every canonical muscle is represented, sometimes by several independently drawn left/right fragments. Unique SVG IDs include the canonical key; press events return the key itself.

## Review

`rtk proxy node scripts/preview-rank-art.cjs` regenerates `docs/design/artwork/preview.html` and `anatomy-review.svg`. The board uses diagnostic rank-token colours to make mapping errors visible. It is a design review artifact, not a sample of a user's ranks. Actual ranks come from the existing TanStack Query hook.

The old geometry-only Rank body component was replaced. Cropped female hair and swapped right glute/abductor assignment were found in the rendered review and corrected before delivery.

# Emblem generation brief

**Mode:** built-in OpenAI `image_gen` tool, new image generation, one call per emblem, `transparent_background: true`. No API key, CLI fallback, reference image or image edit was used. The original returned PNGs were copied into the project with their alpha preserved. This file records reusable prompts matching the delivered art direction; it is not a verbatim transcript of each tool call.

## Shared prompt

Create one original, professionally art-directed fitness rank emblem for a mobile UI. Isolated on a transparent background, centred and square with breathing room around the whole silhouette. Front-facing, symmetrical, crisp 2.5D satin metal and charcoal enamel, restrained bevels, clean edges, controlled studio light from above. Large, simple main symbol; readable at 32 px and detailed at hero sizes. Use only the supplied rank palette as colour direction, with tonal shading for the materials. Keep a consistent material system and progressively more elaborate silhouettes across the set. No words, letters, numbers, division marks, watermark, external glow, backdrop, particles, or game franchise references. Original geometry and symbolism; do not copy an existing game's badge.

Append one of the following asset prompts to the shared prompt:

| Output                         | Asset prompt                                                                                                                         | Palette direction: base / highlight / dark |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `assets/ranks/iron.png`        | Forged iron ingot set in a sturdy chamfered hexagonal shield. Simple, compact starting rank.                                         | `rankColors.iron`                          |
| `assets/ranks/bronze.png`      | Bronze circular medal with a bold ascending double chevron and clean rim. Distinct round silhouette.                                 | `rankColors.bronze`                        |
| `assets/ranks/silver.png`      | Silver kite-shaped shield with one upward arrow and restrained angular side fins.                                                    | `rankColors.silver`                        |
| `assets/ranks/gold.png`        | Gold octagonal medal with a substantial compass-star centre and short laurel accents.                                                | `rankColors.gold`                          |
| `assets/ranks/platinum.png`    | Ice-cyan faceted crystal embedded in a precise hexagonal crest. Premium and geometric.                                               | `rankColors.platinum`                      |
| `assets/ranks/diamond.png`     | Brilliant blue elongated diamond with crisp shard wings. Tall central gem, unmistakably different from Platinum.                     | `rankColors.diamond`                       |
| `assets/ranks/master.png`      | Purple winged trident crest with a strong vertical centre and broad angular wings. Commanding, original silhouette.                  | `rankColors.master`                        |
| `assets/ranks/champion.png`    | Orange and gold crown/flame crest with elegant laurel branches. The most prestigious strength emblem, controlled rather than ornate. | `rankColors.champion`                      |
| `assets/leagues/rookie.png`    | Welcoming bronze open sporting ring surrounding a bold upward arrow. Distinct from the Bronze strength medal.                        | `rankColors.bronze`                        |
| `assets/leagues/contender.png` | Gold hexagonal sporting shield with bold double chevrons and short side fins.                                                        | `rankColors.gold`                          |
| `assets/leagues/elite.png`     | Ice-cyan star with broad swept wings and a refined metallic core.                                                                    | `rankColors.platinum`                      |
| `assets/leagues/legend.png`    | Orange/gold five-point sporting star, small crown and laurel branches. Distinct star silhouette from the Champion strength emblem.   | `rankColors.champion`                      |

Colour values are supplied from `src/theme/tokens.ts`, not a separate artwork palette. Runtime division pips, names and scores are added by components; they are never baked into the bitmap. The app registry can replace any master without changing screens.

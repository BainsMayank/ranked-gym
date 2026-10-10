# Rank and league emblem system

Eight original rank PNGs live here; four weekly-league PNGs live in `../leagues/`. They were generated for this project with OpenAI image generation on 2026-10-09. They are not sourced from a game or a third-party icon pack.

Each is a transparent 1254 × 1254 RGBA master. Raster materials use the existing rank palette as art direction, including tonal shading. Product colours, typography, spacing and components remain token based. Images contain no text or division marks; SVG pips in `RankImageArt` display III = one, II = two, I = three. Champion has no pips. Accessible rank names stay in UI text.

| Rank     | Distinguishing form                  |
| -------- | ------------------------------------ |
| Iron     | Ingot, chamfered hexagonal shield    |
| Bronze   | Circular medal, double chevron       |
| Silver   | Kite shield, upward arrow, side fins |
| Gold     | Octagonal compass star, short laurel |
| Platinum | Cyan crystal, hexagonal crest        |
| Diamond  | Blue elongated gem, shard wings      |
| Master   | Purple winged trident crest          |
| Champion | Orange/gold crown and flame, laurel  |

| Weekly league | Distinguishing form                    | Palette  |
| ------------- | -------------------------------------- | -------- |
| Rookie        | Open sporting ring, upward arrow       | Bronze   |
| Contender     | Hexagonal shield, double chevron, fins | Gold     |
| Elite         | Star and broad wings                   | Platinum |
| Legend        | Crowned five-point star and laurels    | Champion |

Registration is centralised in `src/components/game/artRegistry.ts`; `RankBadge` and `LeagueBadge` consume it. Weekly-league identity is separate from strength-rank identity. Existing code-native SVG badge designs remain in the source tree, but the registry now uses these image masters.

The review board is `docs/design/artwork/preview.html`. Prompts and generation mode are in `docs/design/artwork/PROMPTS.md`. No post-generation image edits were applied. Masters total about 18 MB; device-size exports and decoding/memory checks remain a performance follow-up. Keep these masters if smaller production derivatives are added later.

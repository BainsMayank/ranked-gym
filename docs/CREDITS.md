# Credits and licences

Third-party data and assets used in Ranked Gym, with their licences. Add an entry whenever outside content is used.

## Body map

- **Source**: [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter), ELABBASSI Hicham, revision `8ed39ac2ae9cb46fb79d77eedec7e5b029a75174`.
- **Licence**: [MIT](https://github.com/HichamELBSI/react-native-body-highlighter/blob/main/LICENSE), checked 2026-10-09; full notice retained in `assets/body/LICENSE`.
- **Use**: four male/female front/back SVG contour datasets. Original colours removed, canonical training regions assigned in an adapter, view boxes retained. Details and schematic subdivision limitations in `assets/body/README.md`. The upstream package is not a runtime dependency.

## Rank and league emblems

- Original project artwork generated with OpenAI image generation on 2026-10-09; no third-party game assets or icon pack copied. Eight transparent rank masters and four weekly-league masters; existing rank tokens supplied as palette direction. See `assets/ranks/README.md` and `docs/design/artwork/PROMPTS.md`.

## Exercise library

- **Source**: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) by yuhonas (data originally from exercises.json).
- **Licence**: [The Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md) (public domain dedication), checked 2026-10-06.
- **How we used it**: as a reference for coverage and exercise structure while writing our own library in `supabase/seed/exercises/`. Names were normalised, muscles were re-mapped by hand into our taxonomy (`src/lib/exercises/taxonomy.ts`), duplicates were removed, instructions were rewritten in shorter Indian English, and missing gym staples, calisthenics progressions and Indian names (dand, baithak, surya namaskar) were added. Nothing is copied from it at runtime.
- **Not used**: the dataset's images. Its README doesn't state their licence, so `exercises.media_url` stays empty until we pick a media source with a clear licence (or shoot our own).

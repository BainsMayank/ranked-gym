# Credits and licences

Third-party data and assets used in Ranked Gym, with their licences. Add an entry whenever outside content is used.

## Exercise library

- **Source**: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) by yuhonas (data originally from exercises.json).
- **Licence**: [The Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md) (public domain dedication), checked 2026-10-06.
- **How we used it**: as a reference for coverage and exercise structure while writing our own library in `supabase/seed/exercises/`. Names were normalised, muscles were re-mapped by hand into our taxonomy (`src/lib/exercises/taxonomy.ts`), duplicates were removed, instructions were rewritten in shorter Indian English, and missing gym staples, calisthenics progressions and Indian names (dand, baithak, surya namaskar) were added. Nothing is copied from it at runtime.
- **Not used**: the dataset's images. Its README doesn't state their licence, so `exercises.media_url` stays empty until we pick a media source with a clear licence (or shoot our own).

# Discover ranking

How the Home → Discover tab orders posts and the "People to train with" carousel. Implemented in Postgres (`get_discover`, `get_people_suggestions` in `supabase/migrations/20261010090000_social.sql`); proven in `supabase/tests/database/12_social.test.sql`. Change the numbers here and in the SQL together.

Discover exists to help people find training partners and grow together, so it leans towards people like you (same college, same city, similar level, similar habits), then towards recent posts, then lightly towards posts others found useful.

## Which posts can appear

A post is a candidate only when all of these hold:

- the post's visibility is `public` **and** the author's profile visibility is `public` (the more restrictive of the two always wins, so a friends-only or private profile never reaches Discover);
- the author is onboarded, is not me, is not my friend and is not someone I follow (those are in Feed);
- neither of us has blocked the other;
- it was posted in the 14 days before the page's `as_of` time;
- it is not in `p_exclude` (the ids already shown in this session).

## Score

For a post `p` by author `a`, seen by me:

```
recency     = 0.5 ^ (age_hours / 36)                                  // halves every 36 h
engagement  = min(1, ln(1 + respects + 2 × comments) / ln(51))        // 0..1, saturates around 50
similarity  = 0.30 × same college
            + 0.20 × same city
            + 0.20 × max(0, 1 − |a.overall_score − my.overall_score| / 300)
            + 0.15 × same primary goal
            + 0.15 × max(0, 1 − |a.training_days − my.training_days| / 8)

score = recency × (1 + 0.5 × engagement) × (1 + similarity)
```

- `same college` and `same city` compare case-insensitively; missing values score 0.
- `overall_score` is the Rank Score (0–1000) of a placed overall rank; when either side is unplaced the rank term is 0.
- `training_days` is the number of distinct days (IST) with a completed workout in the last 28 days.
- Similarity ranges 0–1, so a perfect match doubles a post's score; engagement adds at most 50%. Recency still matters most over days: a perfect match from two days ago scores 0.40 × 2 = 0.80, below a brand-new post with no match (1.0), unless engagement lifts it.
- Ties break on post id, so the order is stable.

## Pages and author diversity

The client keeps `as_of` from the first page and passes it back with the ids it has already shown. Each page is filled greedily from the ordered candidates, skipping an author once they have **two posts on that page**; skipped posts stay eligible for later pages. Because shown ids are excluded, pages never repeat, and the cap is exact per page.

## Filters

| Filter         | Keeps                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `college`      | authors with my college                                                                                                         |
| `city`         | authors with my city                                                                                                            |
| `similar_rank` | authors whose overall Rank Score is within 150 of mine (both placed)                                                            |
| `same_goal`    | authors with my primary goal                                                                                                    |
| `calisthenics` | authors with a placed calisthenics rank, a calisthenics primary goal, or a workout post that is at least half calisthenics sets |
| `beginners`    | authors with beginner experience, an unplaced overall rank, or an Iron/Bronze overall rank                                      |

Filters combine with AND.

## Privacy

Goal and experience are **signals and filters only**. Cards never print another person's goal or experience; the `reasons` returned with each post (shown as small chips) are limited to `college`, `city` (when the college differs) and `similar_rank`, which the author already shows publicly. College and city appear only because Discover authors have public profiles.

## People to train with

`get_people_suggestions(limit 12)` lists public, onboarded people with a completed workout in the last 60 days, excluding me, friends, anyone with a pending or recent request either way, people I follow and blocked pairs. It uses the same similarity as above plus `min(0.3, 0.1 × mutual friends)`, and returns reasons from `college`, `city`, `similar_rank` and `mutual`.

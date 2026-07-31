# Polaris — find your night out in Austin

**Elastic × Apify Hack Night, Austin — 2026-07-31 · ~2h hack · 5-min demo**
**Challenge:** *"Use Apify and Elastic to build an Agent that pulls real-time web data and translates them into actionable insights."*
**First vertical:** dance socials (ground truth: austindancesocials.com)

## One-liner

Austin dance calendars rot — the truth lives on Instagram. Polaris keeps the canonical
schedule in Elastic, uses Apify to watch venue/organizer IG accounts and public calendar
sites, and an agent reconciles them into live verdicts — **VERIFIED / CHANGED / CANCELLED**
— on a Snap-map of the city. Every claim cites a real IG post.

> **Apify is the agent's eyes. Elastic is its memory — search index and state store in one.**

## Judging map (30 pts)

| Axis | Play |
|---|---|
| Creativity (10) | Live-verified event graph on a Snapchat-style city map — not a chatbot-over-docs. Personal (we dance in Austin). Real problem: driving to a cancelled social. |
| Completeness (10) | End-to-end live: two Apify actors → Elastic → map + RN app on device. Kibana as second window. Elastic cloud + Apify cloud = deployed backends. |
| Understanding (10) | Elastic = hybrid retrieval (BM25 + ELSER `semantic_text`) **and** durable agent memory (verdicts + evidence + perception log). Apify = real-time perception, pay-per-use, zero scraper infra. |

## Architecture

```
seed/events.json   canonical socials (from austindancesocials.com) + venue geo
seed/sources.json  IG handles + public calendar URLs
        │
        ▼
[ingest.ts] ────────────────────────► Elastic Serverless
                                        events     blurb: semantic_text ← ELSER
                                        ig_posts   the agent's perception log
[pulse.ts] ── Apify actor #1 ───────►   web_pages  crawled calendars, semantic
    contactminerlabs/instagram-posts-reels-scraper---cheap-all-in-one
[crawl.ts] ── Apify actor #2 ───────►
    apify/website-content-crawler  (ADS, salsavida, cabana club, do512)
        │
        ▼
[reconcile.ts]  rule-based agent judgment (NO external LLM — explainable):
    post → event match (handle + day words / "tonight" in America/Chicago)
    cancel regex → CANCELLED · $-regex vs canonical price → CHANGED · else VERIFIED
    _update event docs with {status, evidence{post_url, snippet, rule}, last_checked}
        │
        ▼
[api.ts]  Hono :8787
    GET  /map                      Snap-map (MapLibre + CARTO dark) — pins ringed by status
    GET  /feed?day&style&maxPrice  filtered structured search
    GET  /ask?q=                   RRF hybrid (BM25 + semantic) over events + web_pages
                                   → templated answer + citations
    POST /rsvp                     community stub (rsvp_count++)
        │
        ▼
[app/]  Expo RN — Porch design system · tabs: Tonight · Ask · Saved
```

Excluded on purpose: login-required sources (member.life, bebachata.passion.io) — credentials
in scrapers + ToS + the clock. No external LLM key: semantic = Elastic-hosted ELSER;
verdicts = rules. (If the trial exposes Elastic Managed LLM inference, /ask answers can
upgrade from templated to generated — optional, never a dependency.)

## Elastic usage (the "why Elastic" answer)

1. **Hybrid search** — one `semantic_text` field embeds via ELSER at ingest, zero embedding
   code. `/ask` = RRF over BM25 + semantic. Demo: "beginner friendly country night" →
   Little Longhorn with no keyword overlap.
2. **Agent memory** — perception (`ig_posts`, `web_pages`) and judgment (`status`,
   `evidence`, `last_checked` on `events`) live in Elastic. Kill everything, restart, state
   survives. Idempotent re-runs (doc `_id` = post/page URL, event slug).
3. **Geo** — `location: geo_point` feeds the map (and `geo_distance` "near me" later).
4. **Kibana** — status pie + posts-per-handle bar as the live ops window.

Pre-decided fallbacks: `semantic_text` create fails → plain `text` (ingest.ts auto-falls-back)
and `/ask` degrades to BM25. Bulk errors → per-doc loop.

## Surfaces

- **/map (laptop + projector)** — dark city map, emoji pins per style (🤠🔥🌺🌹🌊), ring
  color = verification status, popup has price/time/badge + **IG evidence link**, day pills,
  30s auto-refresh. Cancelled pins go grayscale.
- **App · Tonight** — Porch-style feed cards: style chips, price, time, verification badge,
  tap badge → IG post.
- **App · Ask** — chat input → `/ask` → answer + citation chips.
- **App · Saved** — "Count me in" → `/rsvp` + local reminder (expo-notifications). Stub tier.

## 2h build order (cut from the bottom)

| t | step | proof |
|---|---|---|
| 0:00–0:10 | Elastic Serverless project + keys into `.env`; `npm i` | `/health` ok |
| 0:10–0:25 | `npm run ingest -- --fresh` | Kibana shows 7+ events |
| 0:25–0:50 | `npm run pulse` — smoke-test 1 handle, then all | posts in Kibana |
| 0:50–1:05 | `npm run reconcile` → `npm run api` → **/map live** | badges on map |
| 1:05–1:15 | `npm run crawl` (parallel with app work) | pages indexed |
| 1:15–1:50 | app: Tonight + Ask wired to API | phone demo |
| 1:50–2:00 | Kibana dashboard · demo dry-run · push + submit | — |

Cut order: Saved tab → rsvp → crawl → Ask polish. Never cut: **map with badges**.

## Demo script (5 min)

1. **Map on projector** — "This is Austin's dance scene tonight, live." Point at green rings.
2. Tap a cancelled pin → grayscale, ✕ badge → **IG evidence link** → the actual post.
   "The calendar says Friday. Instagram says not this Friday. Polaris knew."
3. Phone: Tonight feed + Ask "beginner friendly country night" → semantic hit + citations.
4. Kibana: perception log + verdict pie. "Agent state lives in Elastic — restart anything."
5. Close: eyes/memory one-liner + two actors + $-per-run economics.

## Submission (Airtable)

- [ ] Public GitHub repo — **verify `.env` is NOT committed** (`.gitignore` covers it)
- [ ] Description: One-liner above
- [ ] Why/how Elastic + Apify: sections above
- [ ] Team names + emails

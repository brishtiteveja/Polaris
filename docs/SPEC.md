# Polaris — find your night out in Austin

**Elastic × Apify Hack Night, Austin — 2026-07-31 · ~2h hack · 5-min demo**
**Challenge:** *"Use Apify and Elastic to build an Agent that pulls real-time web data and translates them into actionable insights."*
**First vertical:** dance socials. **Primary source: austindancesocials.com.**

## One-liner

Austin dance calendars rot — the truth lives on Instagram. Polaris ingests the full
austindancesocials.com calendar into Elastic, then uses Apify to watch the Instagram
accounts behind each venue. A rule-based agent reconciles the two into live verdicts —
**VERIFIED / CHANGED / CANCELLED** — on a dark map of the city. Every verdict cites the
exact IG post that produced it.

> **Apify is the agent's eyes. Elastic is its memory — search index and state store in one.**

## Data spine — austindancesocials.com is the source of truth

ADS ships its entire `events[]` and `venues[]` arrays inside its Next.js chunks,
**including a per-event `instagramUrl`**. `npm run ads` parses them (robots.txt: `Allow: /`):

| extracted | count |
|---|---|
| upcoming events (past one-offs dropped) | **70** |
| venues | **29** (46 parsed) |
| Instagram accounts watched | **24** |
| IG posts collected | **201** (86 reels) |
| live verdicts | **28** — 21 VERIFIED, 7 CHANGED |

That single file gives us the canonical calendar **and** tells the agent which IG accounts
to point its eyes at. No hand-typed seed. Re-runnable — the calendar refreshes by re-running
one command. Every event doc carries `source: "austindancesocials.com"`.

Secondary (stretch): `apify/website-content-crawler` over ADS style/day pages + other Austin
calendars, indexed as `web_pages` so `/ask` can cite prose the structured data misses.
Excluded on purpose: login-walled sources (member.life, bebachata.passion.io).

## Judging map (30 pts)

| Axis | Play |
|---|---|
| Creativity (10) | Live-verified event graph on a Snap-style city map. Personal (we dance in Austin), real problem (driving to a cancelled social). Not a chatbot-over-docs. |
| Completeness (10) | **Web app anyone can open** + real Apify runs + Elastic cloud + Kibana. 70 real events, 201 real IG posts, real verdicts, reels playing in-app. |
| Understanding (10) | Elastic = hybrid retrieval (BM25 + ELSER `semantic_text`) **and** durable agent memory. Apify = real-time perception, $0.008/run, zero scraper infra. |

## Architecture

```
austindancesocials.com  ──[ads.ts]──► seed/events.json (70) + seed/sources.json (24 handles)
                                          │
                                          ▼
                              [ingest.ts] ──────► Elastic Serverless
                                                    events    blurb: semantic_text ← ELSER
Instagram (24 venue accounts) ──[pulse.ts]──►       ig_posts  perception log
   apify/instagram-scraper  ~$0.008/run             web_pages (stretch: crawl.ts)
                                          │
                                          ▼
                              [reconcile.ts]  rule-based, no LLM:
                                weekly-rundown captions split per night
                                "closed"/"cancelled" → CANCELLED
                                $ mismatch vs calendar → CHANGED
                                live band / special guest → CHANGED
                                else → VERIFIED   (+ evidence{post_url, snippet, rule})
                                          │
                                          ▼
                              [api.ts] Hono :8873
                                GET /            web app  ← primary demo surface
                                GET /feed        filters (day, style, maxPrice, q)
                                GET /ask         RRF hybrid → answer + citations
                                POST /rsvp       community counter
                                          │
                              ┌───────────┴───────────┐
                         web app (primary)      Expo RN app (stretch)
                         map + list + ask       Porch design system
```

## Surfaces

**1. Expo RN app (PRIMARY — this is the product)** — Porch design system.
- **Tonight** — day pills + style pills; ADS-style cards with time, venue, area, cover,
  style chips, and a **verification badge** (`✓ IG-verified 2h ago` / `⚠ changed` /
  `✕ cancelled`). Tap badge → the IG post that proves it.
- **Ask** — one input → hybrid retrieval → answer + citation chips.
- **Saved** — "Count me in" list, rsvp count, local reminder.

**2. Web app — `GET /` (secondary; ship only if the app is done)**
- **Map view** — dark MapLibre basemap, one pin per venue, emoji by style (🤠🔥🌺🌹🌊),
  **ring colour = verification status**, cancelled pins go grayscale. Popup: time, cover,
  styles, badge, **"IG evidence ↗"** link.
- **List view** — ADS-style day sections and cards, same badges.
- **Ask** — one input, hybrid retrieval, answer + citation chips.
- Day pills + style pills + free-only toggle. Auto-refresh every 30s so a live
  `npm run reconcile` visibly changes the screen mid-demo.

Same API serves both. The web map is the projector-friendly backup if the simulator misbehaves.

## Elastic usage (the "why Elastic" answer)

1. **Hybrid search** — one `semantic_text` field embeds via ELSER at ingest; `/ask` runs RRF
   over BM25 + semantic. Demo query: *"beginner friendly country night"* → Little Longhorn,
   no keyword overlap.
2. **Agent memory** — perception (`ig_posts`) and judgment (`status`, `evidence`,
   `last_checked`) live in Elastic, not process memory. Idempotent (`_id` = post URL / event
   slug); kill everything and restart, nothing is lost.
3. **Geo** — `location: geo_point` drives the map (and `geo_distance` "near me" later).
4. **Kibana** — status pie + posts-per-handle bar as the live ops window.

Pre-decided fallbacks: `semantic_text` create fails → plain `text` (auto), `/ask` → BM25.
Bulk errors → per-doc loop.

## Remaining build order

| step | cmd | proof |
|---|---|---|
| Elastic creds (**human**) | ela.st/hack-austin → `.env` | `/health` |
| indices + 70 events | `npm run ingest -- --fresh` | Kibana count |
| IG posts | `npm run pulse` | posts per handle |
| verdicts | `npm run reconcile` | badge tally |
| API up | `npm run api` | `/feed` returns 70 |
| **app** | `cd app && npm start` | Tonight · Ask on device |
| Kibana dashboard · dry-run · push | — | — |

Cut order: web map → crawl.ts → Saved tab → rsvp. **Never cut: Tonight feed with badges.**

## Demo script (5 min)

1. **Phone/simulator**: Tonight tab — "Austin's dance scene tonight — live."
2. Tap a `✕ cancelled` badge → **the actual IG post**.
   *"The calendar says it's on. Instagram says closed. Polaris read the post."*
3. Ask: *"beginner friendly country night under $10"* → semantic hit + citations.
4. Run `npm run pulse && npm run reconcile` live → screen updates in place.
5. Kibana: perception log + verdict pie. Close on eyes/memory + $0.008/run.

## Submission (Airtable)

- [ ] Public GitHub repo — **verify `.env` never committed**
- [ ] Description = One-liner
- [ ] Why/how Elastic + Apify = sections above
- [ ] Team names + emails

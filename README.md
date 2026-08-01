<p align="center">
  <img src="server/public/logo.svg" width="96" alt="Polaris" />
</p>

<h1 align="center">Polaris</h1>

<p align="center"><strong>Your guide to Austin — social events, verified against Instagram.</strong></p>

<p align="center">
  <em>Built at the Elastic × Apify Hack Night · Austin · July 2026</em>
</p>

---

Every city calendar rots. A venue cancels on Monday, posts it to Instagram, and the
listing site still says the night is on — so you drive across town for nothing.

Polaris keeps the canonical schedule in **Elasticsearch**, uses **Apify** to watch the
Instagram accounts behind every venue, and a rule-based agent reconciles the two into live
verdicts — `VERIFIED` · `CHANGED` · `CANCELLED`. **Every verdict links to the exact
Instagram post that produced it.** Nothing is asserted that can't be traced.

> **Apify is the agent's eyes. Elastic is its memory — search index and state store in one.**

## What it does

| | |
|---|---|
| **Tonight** | Every social happening, with a verification badge. Tap the badge → the IG post behind it. |
| **Map** | Every venue pinned across Austin, ringed green/amber/red by what Instagram says. |
| **Reels** | Clips from the actual dance floors, playing inline. |
| **Ask** | Plain English. *"beginner friendly country night"* finds Little Longhorn — those words appear nowhere in its listing. That's ELSER. |
| **Saved** | Count yourself in, share to a group chat with the verification line attached. |
| **🎲 Pick for me** | Can't decide? It spins. Weighted by the agent's own knowledge — IG-verified nights come up 3×, cancelled ones never. |

## Live numbers (hack night run)

| | |
|---|---|
| events indexed | **76** — 70 dance + 6 farmers' markets |
| venues | **29** across Austin |
| Instagram accounts watched | **24** |
| posts in the perception log | **201** (**86** reels) |
| verdicts written | **82** — 67 `VERIFIED`, 15 `CHANGED` |
| Apify spend | **~$0.20** |

Real examples from that run:

- *Honky Tonk Friday at White Horse* → `✓ IG-verified 8h ago`, quoting the venue's own post
- *Salsa Night at Stargazer* → `⚠ Changed` — the cover on Instagram didn't match the calendar

## How it works

```
austindancesocials.com  ──[ads.ts]──►  seed (events + venues + IG handles)
                                            │
                                            ▼
                                [ingest.ts] ──────►  Elasticsearch
Instagram · 24 venue accounts ──[pulse.ts]──►          events    blurb: semantic_text ← ELSER
  apify/instagram-scraper · ~$0.008/profile            ig_posts  the agent's perception log
                                            │
                                            ▼
                                [reconcile.ts]  rule-based, no LLM:
                                  weekly-rundown captions split per night
                                  "closed"/"cancelled"  → CANCELLED
                                  price ≠ calendar      → CHANGED
                                  otherwise             → VERIFIED
                                  + evidence{post_url, snippet, rule}
                                            │
                                            ▼
                                [api.ts] Hono ──►  Expo RN app (iOS + web) · site · map
```

The calendar source ships its entire `events[]` and `venues[]` arrays inside its Next.js
chunks — including per-event `instagramUrl` — so one command yields the schedule **and**
tells the agent which accounts to watch. No hand-typed seed.

Verdicts are deliberately **rule-based, not LLM-generated**: every one carries the exact
substring that produced it, so a human can audit it in a second.

## Why Elastic / why Apify

- **Elastic** — one `semantic_text` field gives ELSER embeddings at ingest, so `/ask` runs
  true hybrid retrieval (BM25 + semantic via RRF) with *zero* embedding code. The same
  store holds the agent's durable memory: every scraped post, every verdict, every evidence
  link, plus `geo_point` for the map. Kill any process and restart — state survives,
  because it lives in Elasticsearch, not in memory.
- **Apify** — 40k+ actors means no scraper infrastructure to own or maintain. Two actors,
  pay-per-run, fresh data on demand, for pennies.

## Run it

```bash
cp .env.example .env        # Apify token, Elastic Serverless URL + API key
cd server && npm i
npm run ads                 # parse the canonical calendar → seed
npm run ingest -- --fresh   # create indices, load events
npm run pulse               # Apify → Instagram posts → Elastic
npm run reconcile           # agent writes verdicts onto events
npm run api                 # http://localhost:8873
```

```bash
cd app && npm i && npm run web    # http://localhost:8086
```

Re-running `pulse` + `reconcile` refreshes verdicts and imagery — Instagram's CDN URLs are
signed and expire after a few hours.

**Endpoints:** `/feed` · `/ask` · `/reels` · `/rsvp` · `/img` (CDN proxy) · `/map` · `/health`

## Stack

**Apify** `apify/instagram-scraper`, `apify/website-content-crawler` ·
**Elastic Serverless** ELSER / `semantic_text`, RRF hybrid retrieval, `geo_point`, Kibana ·
**Server** TypeScript + Hono · **App** Expo React Native (iOS + web), MapLibre

## Spec

See [docs/SPEC.md](docs/SPEC.md).

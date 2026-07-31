# ⭐ Polaris

**Find your night out in Austin — live-verified dance socials on a map.**

Built at the Elastic × Apify Hack Night (Austin, Jul 2026).

Austin dance calendars rot; the truth lives on Instagram. Polaris keeps the canonical
schedule in **Elastic**, watches venue/organizer Instagram accounts and public calendar
sites with **Apify**, and a rule-based agent reconciles them into live verdicts —
`VERIFIED / CHANGED / CANCELLED` — pinned on a dark Snap-style map of Austin. Every
verdict links to the IG post that proves it.

> **Apify is the agent's eyes. Elastic is its memory — search index and state store in one.**

## Stack

- **Apify** — `contactminerlabs/instagram-posts-reels-scraper---cheap-all-in-one` (IG posts)
  + `apify/website-content-crawler` (public calendars: austindancesocials.com, salsavida, …)
- **Elastic Serverless** — `semantic_text`/ELSER hybrid retrieval (RRF), geo_point, agent
  state (`status`, `evidence`, perception log), Kibana dashboard
- **Server** — TypeScript + Hono (`/map`, `/feed`, `/ask`, `/rsvp`)
- **App** — Expo React Native (Porch design system)

## Run it

```bash
cp .env.example .env   # fill: Apify token, Elastic Serverless URL + API key
cd server && npm i
npm run ingest -- --fresh   # indices + canonical seed
npm run pulse               # Apify → Instagram posts → Elastic
npm run crawl               # Apify → calendar pages → Elastic
npm run reconcile           # agent verdicts written onto events
npm run api                 # http://localhost:8787/map
```

`GET /ask?q=beginner+friendly+country+night` → hybrid (BM25+ELSER) answer with citations.

## Why Elastic / why Apify (judges' question)

- **Elastic**: one `semantic_text` field gives ELSER embeddings at ingest — hybrid RRF
  search with zero embedding code — and the same store holds the agent's durable memory:
  every scraped post, every verdict, every evidence link. Kibana watches it live.
- **Apify**: 40k actors = no scraper infra. Two actors, pay-per-run, fresh data on demand.

## Spec

See [docs/SPEC.md](docs/SPEC.md).

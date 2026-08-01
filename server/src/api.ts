// Polaris API — three routes the app needs. Hono on :8787.
//   GET  /feed?day=FRI&style=salsa&maxPrice=15
//   GET  /ask?q=beginner+friendly+country+night
//   POST /rsvp {"id": "fuego-friday"}
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { es, esConfigured, IDX, todayAustin } from './es.js';
import seed from '../seed/events.json' with { type: 'json' };

const app = new Hono();
app.use('*', cors());

// Degraded mode: with no Elastic creds the API still serves the canonical
// austindancesocials.com seed so the app is developable (and the demo has a
// floor). Everything Elastic adds — semantic search, IG verdicts — is absent,
// and /health says so plainly rather than pretending.
const LOCAL = !esConfigured;
if (LOCAL) {
  console.warn('⚠ No ELASTIC_URL/ELASTIC_API_KEY — serving seed file, no semantic search, no IG verdicts.');
}
const seedEvents = (seed as any[]).map((e) => ({ ...e, status: 'UNVERIFIED', rsvp_count: 0 }));
const localRsvp = new Map<string, number>();

app.get('/health', (c) =>
  c.json({ ok: true, today: todayAustin(), mode: LOCAL ? 'local-seed' : 'elastic', events: seedEvents.length })
);

// The site: list + dark city map + Ask, all against this API. Read per request
// so editing the HTML during the hack doesn't need a server restart.
const page = (f: string) => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');
app.get('/', (c) => c.html(page('app.html')));
app.get('/map', (c) => c.html(page('map.html')));

// Instagram's CDN sets Cross-Origin-Resource-Policy, so browsers refuse to
// render its images from our origin. Streaming them through here fixes the web
// app (native RN is unaffected). Host allowlist keeps this from being an open
// proxy — it will only fetch from Instagram/Facebook CDNs.
const IMG_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

app.get('/img', async (c) => {
  const u = c.req.query('u');
  if (!u) return c.text('u required', 400);
  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return c.text('bad url', 400);
  }
  if (target.protocol !== 'https:' || !IMG_HOSTS.test(target.hostname)) {
    return c.text('host not allowed', 403);
  }
  const upstream = await fetch(target.toString());
  if (!upstream.ok || !upstream.body) return c.text('upstream failed', 502);
  return new Response(upstream.body, {
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': 'public, max-age=3600',
    },
  });
});

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** One deterministic sentence per event — every word traceable to a doc field. */
function describe(e: any): string {
  const price = e.price_usd === 0 ? 'free' : e.price_usd != null ? `$${e.price_usd}` : 'cover varies';
  const badge =
    e.status === 'VERIFIED' ? '✓ IG-verified' :
    e.status === 'CHANGED' ? '⚠ changed — see IG' :
    e.status === 'CANCELLED' ? '✕ CANCELLED per IG' : 'not yet verified';
  return `${e.name} — ${e.venue} (${e.area}), ${e.day} ${e.start}, ${price} · ${badge}`;
}

app.get('/feed', async (c) => {
  const { day, style, maxPrice, q } = c.req.query();

  if (LOCAL) {
    const out = seedEvents
      .filter((e) => (!day || e.day === day.toUpperCase()))
      .filter((e) => (!style || (e.styles ?? []).includes(style.toLowerCase())))
      .filter((e) => (!maxPrice || e.price_usd == null || e.price_usd <= Number(maxPrice)))
      .filter((e) => (!q || `${e.name} ${e.venue} ${e.blurb}`.toLowerCase().includes(q.toLowerCase())))
      .map((e) => ({ ...e, rsvp_count: localRsvp.get(e.id) ?? 0 }))
      .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start.localeCompare(b.start));
    return c.json({ today: todayAustin(), mode: 'local-seed', events: out });
  }

  const filter: any[] = [];
  if (day) filter.push({ term: { day: day.toUpperCase() } });
  if (style) filter.push({ term: { styles: style.toLowerCase() } });
  if (maxPrice) filter.push({
    bool: {
      should: [
        { range: { price_usd: { lte: Number(maxPrice) } } },
        { bool: { must_not: { exists: { field: 'price_usd' } } } },
      ],
    },
  });
  const res = await es.search({
    index: IDX.events,
    size: 60,
    query: { bool: { filter, ...(q ? { must: { multi_match: { query: q, fields: ['name^2', 'venue', 'price_note', 'blurb'] } } } : {}) } },
    sort: q ? undefined : [{ day: 'asc' }, { start: 'asc' }],
  });
  return c.json({
    today: todayAustin(),
    events: res.hits.hits.map((h) => ({ id: h._id, ...(h._source as object) })),
  });
});

// Hybrid retrieval: BM25 + ELSER via RRF. Falls back to BM25 if the semantic
// field wasn't available at index-create time (see ingest.ts fallback).
async function hybrid(index: string, q: string, textFields: string[], semField: string, size: number) {
  try {
    return await es.search({
      index,
      size,
      retriever: {
        rrf: {
          retrievers: [
            { standard: { query: { multi_match: { query: q, fields: textFields } } } },
            { standard: { query: { semantic: { field: semField, query: q } } } },
          ],
        },
      } as any,
    });
  } catch {
    return es.search({ index, size, query: { multi_match: { query: q, fields: textFields } } });
  }
}

app.get('/ask', async (c) => {
  const q = c.req.query('q');
  if (!q) return c.json({ error: 'q required' }, 400);

  if (LOCAL) {
    const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const scored = seedEvents
      .map((e) => {
        const hay = `${e.name} ${e.venue} ${e.area} ${e.styles?.join(' ')} ${e.blurb}`.toLowerCase();
        return { e, score: terms.filter((t) => hay.includes(t)).length };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.e);
    return c.json({
      answer: scored.length
        ? scored.slice(0, 3).map(describe).join('\n')
        : 'Nothing matching — try another style, day, or area.',
      events: scored,
      citations: [],
      mode: 'local-seed',
    });
  }

  const [evRes, pgRes] = await Promise.all([
    hybrid(IDX.events, q, ['name^2', 'venue', 'area', 'price_note', 'blurb'], 'blurb', 4),
    hybrid(IDX.pages, q, ['title^2', 'text'], 'text_sem', 2).catch(() => null),
  ]);

  const events = evRes.hits.hits.map((h) => ({ id: h._id, ...(h._source as any) }));
  const lines = events.slice(0, 3).map(describe);
  const citations = [
    ...events.filter((e) => e.evidence?.post_url).map((e) => ({ label: `IG @${e.ig_handle}`, url: e.evidence.post_url })),
    ...(pgRes?.hits.hits ?? []).map((h) => {
      const s = h._source as any;
      return { label: s.site, url: s.url };
    }),
  ];
  return c.json({
    answer: lines.length ? lines.join('\n') : 'Nothing matching — try another style, day, or area.',
    events,
    citations,
  });
});

app.post('/rsvp', async (c) => {
  const { id } = await c.req.json();
  if (!id) return c.json({ error: 'id required' }, 400);

  if (LOCAL) {
    const n = (localRsvp.get(id) ?? 0) + 1;
    localRsvp.set(id, n);
    return c.json({ id, rsvp_count: n, mode: 'local-seed' });
  }

  const res = await es.update({
    index: IDX.events,
    id,
    script: { source: 'ctx._source.rsvp_count = (ctx._source.rsvp_count ?: 0) + 1' },
    refresh: true,
  } as any);
  const doc = await es.get({ index: IDX.events, id });
  return c.json({ id, rsvp_count: (doc._source as any).rsvp_count, result: res.result });
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
console.log(`Polaris API on http://localhost:${port} — /health /feed /ask /rsvp`);

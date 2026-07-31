// Polaris API — three routes the app needs. Hono on :8787.
//   GET  /feed?day=FRI&style=salsa&maxPrice=15
//   GET  /ask?q=beginner+friendly+country+night
//   POST /rsvp {"id": "fuego-friday"}
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { es, IDX, todayAustin } from './es.js';

const app = new Hono();
app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true, today: todayAustin() }));

// Snap-map style dark map of tonight's Austin dance scene (MapLibre + CARTO tiles).
const mapHtml = readFileSync(new URL('../public/map.html', import.meta.url), 'utf8');
app.get('/map', (c) => c.html(mapHtml));
app.get('/', (c) => c.redirect('/map'));

app.get('/feed', async (c) => {
  const { day, style, maxPrice, q } = c.req.query();
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

  const [evRes, pgRes] = await Promise.all([
    hybrid(IDX.events, q, ['name^2', 'venue', 'area', 'price_note', 'blurb'], 'blurb', 4),
    hybrid(IDX.pages, q, ['title^2', 'text'], 'text_sem', 2).catch(() => null),
  ]);

  const events = evRes.hits.hits.map((h) => ({ id: h._id, ...(h._source as any) }));
  // Templated answer — deterministic, every line traceable to a doc.
  const lines = events.slice(0, 3).map((e) => {
    const price = e.price_usd === 0 ? 'free' : e.price_usd != null ? `$${e.price_usd}` : 'cover varies';
    const badge =
      e.status === 'VERIFIED' ? '✓ IG-verified' :
      e.status === 'CHANGED' ? '⚠ changed — see IG' :
      e.status === 'CANCELLED' ? '✕ CANCELLED per IG' : 'unverified';
    return `${e.name} — ${e.venue} (${e.area}), ${e.day} ${e.start}, ${price} · ${badge}`;
  });
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

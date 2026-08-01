// Creates the three indices and bulk-loads the canonical event seed.
// Usage: npm run ingest [-- --fresh]   (--fresh drops existing indices first)
import { es, requireEs, IDX } from './es.js';
import danceEvents from '../seed/events.json' with { type: 'json' };
import markets from '../seed/markets.json' with { type: 'json' };

// Polaris is a guide to Austin social life, not just dance. Dance is the first
// vertical (scraped from austindancesocials.com); farmers' markets are the
// second (curated). Same doc shape, same verification pipeline — a market's
// Instagram gets watched exactly like a venue's.
const events = [
  ...(danceEvents as any[]).map((e) => ({ category: 'dance', ...e })),
  ...(markets as any[]),
];

requireEs();

// --fresh rebuilds the events index only. The Instagram perception log costs
// real Apify runs to rebuild, so it survives unless --wipe is explicit.
const wipe = process.argv.includes('--wipe');
const fresh = wipe || process.argv.includes('--fresh');

// semantic_text → Elastic-hosted ELSER embeds at ingest time (no external LLM).
// If the trial project rejects semantic_text we fall back to plain text so the
// night never blocks on it; /ask degrades to BM25 automatically.
async function createIndex(
  name: string,
  semanticFields: string[],
  extra: Record<string, unknown>,
  opts: { rebuildable?: boolean } = {}
) {
  const drop = opts.rebuildable ? fresh : wipe;
  if (drop && (await es.indices.exists({ index: name }))) {
    await es.indices.delete({ index: name });
    console.log(`dropped ${name}`);
  }
  if (await es.indices.exists({ index: name })) {
    console.log(`${name} exists — skipping create`);
    return;
  }
  const props = (semantic: boolean): Record<string, unknown> => ({
    ...extra,
    ...Object.fromEntries(semanticFields.map((f) => [f, { type: semantic ? 'semantic_text' : 'text' }])),
  });
  try {
    await es.indices.create({ index: name, mappings: { properties: props(true) as any } });
    console.log(`created ${name} (semantic)`);
  } catch (e: any) {
    console.warn(`semantic_text failed for ${name} (${e?.message}) — falling back to text`);
    await es.indices.create({ index: name, mappings: { properties: props(false) as any } });
    console.log(`created ${name} (BM25 only)`);
  }
}

await createIndex(IDX.events, ['blurb'], {
  name: { type: 'text' },
  venue: { type: 'keyword' },
  area: { type: 'keyword' },
  day: { type: 'keyword' },
  start: { type: 'keyword' },
  end: { type: 'keyword' },
  styles: { type: 'keyword' },
  live_music: { type: 'boolean' },
  lesson: { type: 'boolean' },
  price_usd: { type: 'float' },
  price_note: { type: 'text' },
  organizer: { type: 'text' },
  address: { type: 'text' },
  ig_handle: { type: 'keyword' },
  category: { type: 'keyword' },
  hero_image: { type: 'keyword', index: false },
  ig_profile: { type: 'keyword', index: false },
  ig_reel: { type: 'keyword', index: false },
  location: { type: 'geo_point' },
  location_approx: { type: 'boolean' },
  status: { type: 'keyword' },
  evidence: { type: 'object', enabled: true },
  last_checked: { type: 'date' },
  rsvp_count: { type: 'integer' },
}, { rebuildable: true });

await createIndex(IDX.posts, ['caption_sem'], {
  handle: { type: 'keyword' },
  caption: { type: 'text' },
  url: { type: 'keyword' },
  taken_at: { type: 'date' },
  matched_event: { type: 'keyword' },
  is_reel: { type: 'boolean' },
  image: { type: 'keyword', index: false },
  video: { type: 'keyword', index: false },
  likes: { type: 'integer' },
  raw: { type: 'object', enabled: false },
});

await createIndex(IDX.pages, ['text_sem'], {
  url: { type: 'keyword' },
  site: { type: 'keyword' },
  title: { type: 'text' },
  text: { type: 'text' },
  fetched_at: { type: 'date' },
});

// Bulk-load canonical events. _id = stable slug → re-runs are idempotent.
const ops = events.flatMap((e: any) => [
  { index: { _index: IDX.events, _id: e.id } },
  { ...e, status: 'UNVERIFIED', rsvp_count: 0 },
]);
const res = await es.bulk({ operations: ops, refresh: true });
if (res.errors) {
  const bad = res.items.filter((i: any) => i.index?.error);
  console.error(`bulk had ${bad.length} errors — first:`, JSON.stringify(bad[0], null, 2));
  // Fallback: per-doc insert without the semantic field is never needed for 53 docs,
  // but if the semantic pipeline hiccups, retry each doc individually.
  for (const e of events as any[]) {
    try {
      await es.index({ index: IDX.events, id: e.id, document: { ...e, status: 'UNVERIFIED', rsvp_count: 0 } });
    } catch (err: any) {
      console.error(`  still failing ${e.id}: ${err?.message}`);
    }
  }
}
const count = await es.count({ index: IDX.events });
console.log(`events indexed: ${count.count}`);

// The agent's eyes: Apify scrapes the Instagram accounts behind Austin's dance
// venues; every post lands in Elastic as the agent's perception log.
//
// Actor: apify/instagram-scraper (~$0.008 per profile run, profile-based).
// Note: contactminerlabs/instagram-posts-reels-scraper is keyword-only and
// requires a paid rental — the official scraper takes profile URLs, which is
// what verification needs.
//
// Usage: npm run pulse [-- --handles a,b] [--limit 8]
import { ApifyClient } from 'apify-client';
import { es, requireEs, IDX } from './es.js';
import sources from '../seed/sources.json' with { type: 'json' };

requireEs();

const token = process.env.PERSONAL_APIFY_TOKEN;
if (!token) {
  console.error('Missing PERSONAL_APIFY_TOKEN in .env');
  process.exit(1);
}

const ACTOR = 'apify/instagram-scraper';

const argv = process.argv.slice(2);
const flag = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const handles = (flag('handles')?.split(',') ?? sources.instagram_handles).map((h) => h.trim()).filter(Boolean);
const limit = Number(flag('limit') ?? 6);

console.log(`${ACTOR} · ${handles.length} handles · ${limit} posts each`);
const apify = new ApifyClient({ token });

const run = await apify.actor(ACTOR).call({
  directUrls: handles.map((h) => `https://www.instagram.com/${h}/`),
  resultsType: 'posts',
  resultsLimit: limit,
  addParentData: false,
});
console.log(`run ${run.id} → ${run.status} · $${run.usageTotalUsd?.toFixed(4)}`);

const { items } = await apify.dataset(run.defaultDatasetId).listItems();
console.log(`dataset items: ${items.length}`);

const docs = (items as Record<string, any>[])
  .filter((it) => it.url && (it.caption ?? '').length > 0)
  .map((it) => ({
    handle: String(it.ownerUsername ?? '').toLowerCase(),
    caption: String(it.caption),
    caption_sem: String(it.caption).slice(0, 2000),
    url: String(it.url),
    taken_at: it.timestamp ? new Date(it.timestamp).toISOString() : null,
    likes: it.likesCount ?? null,
    hashtags: it.hashtags ?? [],
    image: it.displayUrl ?? null,
  }));

if (docs.length === 0) {
  console.error('No usable posts — check handles / actor output.');
  process.exit(1);
}

// _id = post URL → re-running pulse never duplicates the perception log.
const ops = docs.flatMap((d) => [{ index: { _index: IDX.posts, _id: d.url } }, d]);
const res = await es.bulk({ operations: ops, refresh: true });
if (res.errors) console.warn('some bulk items failed:', JSON.stringify(res.items.find((i: any) => i.index?.error), null, 1));

const byHandle = docs.reduce<Record<string, number>>((a, d) => ({ ...a, [d.handle]: (a[d.handle] ?? 0) + 1 }), {});
console.log('posts per handle:', byHandle);
console.log(`ig_posts total: ${(await es.count({ index: IDX.posts })).count}`);

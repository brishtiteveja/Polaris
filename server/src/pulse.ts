// The agent's eyes: run the Apify Instagram scraper over our source handles
// and index every post into Elastic (idempotent — _id = post URL).
//
// Actor: contactminerlabs/instagram-posts-reels-scraper---cheap-all-in-one
// Usage: npm run pulse [-- --handles echalesalsita.austin,jewlzfletch] [--limit 8]
import { ApifyClient } from 'apify-client';
import { es, IDX } from './es.js';
import sources from '../seed/sources.json' with { type: 'json' };

const token = process.env.PERSONAL_APIFY_TOKEN;
if (!token) {
  console.error('Missing PERSONAL_APIFY_TOKEN in .env');
  process.exit(1);
}

const ACTOR = 'contactminerlabs/instagram-posts-reels-scraper---cheap-all-in-one';

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const handles = (flag('handles')?.split(',') ?? sources.instagram_handles).map((h) => h.trim()).filter(Boolean);
const limit = Number(flag('limit') ?? 6);

console.log(`running ${ACTOR}\n  handles: ${handles.join(', ')}\n  per-handle limit: ${limit}`);

const apify = new ApifyClient({ token });

// Field names differ between IG actors; send a permissive input and normalize output.
// If the run fails on input validation, check the actor's Input tab and adjust here.
const input: Record<string, unknown> = {
  usernames: handles,
  username: handles,
  resultsLimit: limit,
  maxPosts: limit,
};

const run = await apify.actor(ACTOR).call(input);
console.log(`run ${run.id} → status ${run.status}`);

const { items } = await apify.dataset(run.defaultDatasetId).listItems();
console.log(`dataset items: ${items.length}`);
if (items.length > 0) console.log('first item keys:', Object.keys(items[0] as object).join(', '));

type Norm = { handle: string; caption: string; url: string; taken_at: string | null };
function normalize(it: Record<string, any>): Norm | null {
  const caption = it.caption ?? it.captionText ?? it.text ?? it.description ?? '';
  const url = it.url ?? it.postUrl ?? it.post_url ?? it.link ?? it.shortcode_url ?? null;
  const handle =
    it.ownerUsername ?? it.username ?? it.owner_username ?? it.handle ?? it.profile ?? it.user?.username ?? '';
  const tsRaw = it.timestamp ?? it.takenAt ?? it.taken_at ?? it.publishedAt ?? it.createTime ?? null;
  if (!url) return null;
  let taken_at: string | null = null;
  if (tsRaw != null) {
    const d = typeof tsRaw === 'number' ? new Date(tsRaw < 1e12 ? tsRaw * 1000 : tsRaw) : new Date(tsRaw);
    if (!Number.isNaN(d.getTime())) taken_at = d.toISOString();
  }
  return { handle: String(handle).toLowerCase(), caption: String(caption), url: String(url), taken_at };
}

const docs = (items as Record<string, any>[]).map((it) => ({ n: normalize(it), raw: it })).filter((d) => d.n);
if (docs.length === 0) {
  console.error('No usable items — inspect the first raw item above and fix normalize()/input.');
  process.exit(1);
}

const ops = docs.flatMap(({ n, raw }) => [
  { index: { _index: IDX.posts, _id: n!.url } },
  { ...n, caption_sem: n!.caption, raw },
]);
const res = await es.bulk({ operations: ops, refresh: true });
console.log(`indexed ${docs.length} posts${res.errors ? ' (with some errors)' : ''}`);
const count = await es.count({ index: IDX.posts });
console.log(`ig_posts total: ${count.count}`);

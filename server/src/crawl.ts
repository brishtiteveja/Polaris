// Second pair of eyes: Apify Website Content Crawler over public Austin dance
// calendars. Pages are indexed whole (semantic_text) — no brittle parsing;
// /ask retrieves and cites them directly.
// Usage: npm run crawl [-- --pages 12]
import { ApifyClient } from 'apify-client';
import { es, IDX } from './es.js';
import sources from '../seed/sources.json' with { type: 'json' };

const token = process.env.PERSONAL_APIFY_TOKEN;
if (!token) {
  console.error('Missing PERSONAL_APIFY_TOKEN in .env');
  process.exit(1);
}

const argv = process.argv.slice(2);
const i = argv.indexOf('--pages');
const maxPages = Number(i >= 0 ? argv[i + 1] : 12);

const apify = new ApifyClient({ token });
console.log(`crawling ${sources.crawl_urls.length} sites, max ${maxPages} pages total`);

const run = await apify.actor('apify/website-content-crawler').call({
  startUrls: sources.crawl_urls.map((url: string) => ({ url })),
  maxCrawlPages: maxPages,
  maxCrawlDepth: 1,
  saveMarkdown: false,
});
console.log(`run ${run.id} → ${run.status}`);

const { items } = await apify.dataset(run.defaultDatasetId).listItems();
console.log(`pages fetched: ${items.length}`);

const ops = (items as Record<string, any>[])
  .filter((p) => p.url && (p.text ?? '').length > 100)
  .flatMap((p) => {
    const text = String(p.text).slice(0, 6000);
    return [
      { index: { _index: IDX.pages, _id: p.url } },
      {
        url: p.url,
        site: new URL(p.url).hostname,
        title: p.metadata?.title ?? '',
        text,
        text_sem: text,
        fetched_at: new Date().toISOString(),
      },
    ];
  });
if (ops.length === 0) {
  console.error('No pages with text — check crawl output.');
  process.exit(1);
}
const res = await es.bulk({ operations: ops, refresh: true });
console.log(`indexed ${ops.length / 2} pages${res.errors ? ' (with some errors)' : ''}`);

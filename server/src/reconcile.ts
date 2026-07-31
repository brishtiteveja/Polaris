// The agent's judgment: read recent IG posts from Elastic, match them to
// canonical events, and write verdicts back onto the event docs.
// Deliberately rule-based (no LLM) — every verdict is explainable in one line.
// Usage: npm run reconcile
import { es, IDX, austinDay, todayAustin } from './es.js';

const DAY_WORDS: Record<string, string> = {
  monday: 'MON', mon: 'MON',
  tuesday: 'TUE', tue: 'TUE', tues: 'TUE',
  wednesday: 'WED', wed: 'WED',
  thursday: 'THU', thu: 'THU', thurs: 'THU',
  friday: 'FRI', fri: 'FRI',
  saturday: 'SAT', sat: 'SAT',
  sunday: 'SUN', sun: 'SUN',
};

const CANCEL_RE =
  /\b(cancel(?:l?ed|ing)?|postponed|rescheduled|closed\s+(?:tonight|today|this\s+week)|no\s+(?:dance|dancing|social|class(?:es)?|practica|lesson(?:s)?)\s+(?:tonight|today|this\s+week))\b/i;
const PRICE_RE = /\$\s?(\d{1,3})(?!\d)/g;

type EventDoc = {
  id: string; day: string; ig_handle?: string; price_usd: number | null;
  evidence?: { posted_at?: string };
};

// Load all events, group by handle.
const evRes = await es.search({ index: IDX.events, size: 200, query: { match_all: {} } });
const events = evRes.hits.hits.map((h) => ({ id: h._id as string, ...(h._source as any) })) as EventDoc[];
const byHandle = new Map<string, EventDoc[]>();
for (const e of events) {
  if (!e.ig_handle) continue;
  const k = e.ig_handle.toLowerCase();
  byHandle.set(k, [...(byHandle.get(k) ?? []), e]);
}

// Recent posts only — stale posts must not flip fresh verdicts.
const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
const postRes = await es.search({
  index: IDX.posts,
  size: 500,
  query: { range: { taken_at: { gte: since } } },
  sort: [{ taken_at: 'asc' }], // oldest first → newest post wins the final write
});
const posts = postRes.hits.hits.map((h) => ({ _id: h._id as string, ...(h._source as any) }));
console.log(`events: ${events.length} · recent posts: ${posts.length}`);

function daysMentioned(caption: string, takenAt: string | null): Set<string> {
  const out = new Set<string>();
  const lower = caption.toLowerCase();
  for (const [word, code] of Object.entries(DAY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) out.add(code);
  }
  if (/\btonight\b|\btoday\b/.test(lower) && takenAt) out.add(austinDay(takenAt));
  return out;
}

let verdicts = 0;
for (const post of posts) {
  const candidates = byHandle.get(String(post.handle ?? '').toLowerCase()) ?? [];
  if (candidates.length === 0) continue;
  const caption: string = post.caption ?? '';
  const days = daysMentioned(caption, post.taken_at ?? null);
  const prices = [...caption.matchAll(PRICE_RE)].map((m) => Number(m[1]));

  for (const ev of candidates) {
    // A post is about this event if it names the event's day (or says tonight on that day).
    // A handle with exactly one event gets benefit of the doubt on undated posts.
    const relevant = days.has(ev.day) || (days.size === 0 && candidates.length === 1);
    if (!relevant) continue;

    let status = 'VERIFIED';
    let note = 'recent post mentions this night';
    if (CANCEL_RE.test(caption)) {
      status = 'CANCELLED';
      note = `matched: "${caption.match(CANCEL_RE)?.[0]}"`;
    } else if (
      typeof ev.price_usd === 'number' &&
      prices.length > 0 &&
      !prices.includes(ev.price_usd)
    ) {
      status = 'CHANGED';
      note = `price on IG: $${prices.join('/$')} vs listed $${ev.price_usd}`;
    }

    await es.update({
      index: IDX.events,
      id: ev.id,
      doc: {
        status,
        evidence: {
          post_url: post.url,
          posted_at: post.taken_at,
          snippet: caption.slice(0, 180),
          rule: note,
        },
        last_checked: new Date().toISOString(),
      },
    });
    await es.update({ index: IDX.posts, id: post._id, doc: { matched_event: ev.id } }).catch(() => {});
    verdicts++;
    console.log(`  ${status.padEnd(9)} ${ev.id}  (${note})`);
  }
}
await es.indices.refresh({ index: IDX.events });
console.log(`verdicts written: ${verdicts} · today in Austin: ${todayAustin()}`);

// The agent's judgment. Reads the perception log (ig_posts) out of Elastic,
// matches posts to canonical events, and writes verdicts back onto the events.
//
// Deliberately rule-based — no LLM. Every verdict carries the exact substring
// that produced it, so the app can show its work and a human can audit it.
//
// Usage: npm run reconcile
import { es, requireEs, IDX, austinDay, todayAustin } from './es.js';

requireEs();

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_WORD: Record<string, string> = {
  sunday: 'SUN', sun: 'SUN', monday: 'MON', mon: 'MON', tuesday: 'TUE', tue: 'TUE', tues: 'TUE',
  wednesday: 'WED', wed: 'WED', thursday: 'THU', thu: 'THU', thurs: 'THU',
  friday: 'FRI', fri: 'FRI', saturday: 'SAT', sat: 'SAT',
};

const CLOSED_RE = /\b(closed|cancel(?:l?ed|ing)?|no\s+(?:dance|dancing|social|class(?:es)?|practica|lesson(?:s)?)|postponed|rescheduled|dark\s+night)\b/i;
const PRICE_RE = /\$\s?(\d{1,3})(?!\d)/g;
const SPECIAL_RE = /\b(live\s+band|special\s+guest|dj\s+\w+|anniversary|festival|pop-?up|guest\s+instructor)\b/i;

type EventDoc = {
  id: string; name: string; day: string; ig_handle?: string; price_usd: number | null; styles?: string[];
};

/**
 * Venues post weekly rundowns, one line per night:
 *   "7/13, Monday: CLOSED"
 *   "7/14, Tuesday: Free two-step lessons 7-8pm, then Fingerpistol"
 * Split those into per-day segments so a Monday closure never taints Tuesday.
 * Falls back to one whole-caption segment when there's no day structure.
 */
function segmentByDay(caption: string, takenAt: string | null): { day: string | null; text: string }[] {
  const lines = caption.split(/\n+/);
  const segs: { day: string | null; text: string }[] = [];
  let current: { day: string | null; text: string } | null = null;

  for (const line of lines) {
    const m = line.match(/(?:^|[,\s])(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b\s*:?/i);
    if (m) {
      if (current) segs.push(current);
      current = { day: DAY_WORD[m[1].toLowerCase()], text: line };
    } else if (current) {
      current.text += ' ' + line;
    }
  }
  if (current) segs.push(current);

  if (segs.length === 0) {
    // Undated post: "tonight"/"today" resolves against the post's own timestamp.
    const lower = caption.toLowerCase();
    let day: string | null = null;
    if (/\btonight\b|\btoday\b/.test(lower) && takenAt) day = austinDay(takenAt);
    else {
      for (const [w, code] of Object.entries(DAY_WORD)) {
        if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) { day = code; break; }
      }
    }
    segs.push({ day, text: caption });
  }
  return segs;
}

const evRes = await es.search({ index: IDX.events, size: 500, query: { match_all: {} } });
const events = evRes.hits.hits.map((h) => ({ id: h._id as string, ...(h._source as any) })) as EventDoc[];

const byHandle = new Map<string, EventDoc[]>();
for (const e of events) {
  if (!e.ig_handle) continue;
  const k = e.ig_handle.toLowerCase();
  byHandle.set(k, [...(byHandle.get(k) ?? []), e]);
}

// Only recent posts get to speak — a three-month-old cancellation is not news.
const since = new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString();
const postRes = await es.search({
  index: IDX.posts,
  size: 1000,
  query: { range: { taken_at: { gte: since } } },
  sort: [{ taken_at: 'asc' }], // newest post wins the last write
});
const posts = postRes.hits.hits.map((h) => ({ _id: h._id as string, ...(h._source as any) }));
console.log(`events ${events.length} (${byHandle.size} watched handles) · recent posts ${posts.length}`);

// Give every watched event a face: the venue's most recent post image, plus a
// link to their profile and their latest reel. Independent of verdicts — an
// unverified event still deserves a picture of the room.
const lookByHandle = new Map<string, { image?: string; reel?: string; posts: number }>();
for (const p of posts) {
  const h = String(p.handle ?? '').toLowerCase();
  if (!h) continue;
  const cur = lookByHandle.get(h) ?? { posts: 0 };
  if (p.image) cur.image = p.image; // posts are ascending → last write is newest
  if (p.is_reel && p.url) cur.reel = p.url;
  cur.posts++;
  lookByHandle.set(h, cur);
}

let looks = 0;
for (const [handle, look] of lookByHandle) {
  for (const ev of byHandle.get(handle) ?? []) {
    await es.update({
      index: IDX.events,
      id: ev.id,
      doc: {
        hero_image: look.image ?? null,
        ig_profile: `https://www.instagram.com/${handle}/`,
        ig_reel: look.reel ?? null,
        ig_post_count: look.posts,
      },
    });
    looks++;
  }
}
console.log(`attached imagery to ${looks} events from ${lookByHandle.size} accounts`);

let n = 0;
const tally: Record<string, number> = {};

for (const post of posts) {
  const candidates = byHandle.get(String(post.handle ?? '').toLowerCase()) ?? [];
  if (!candidates.length) continue;

  for (const seg of segmentByDay(post.caption ?? '', post.taken_at ?? null)) {
    for (const ev of candidates) {
      // Only judge an event when the post actually speaks about its night.
      const speaksToThisEvent = seg.day === ev.day || (seg.day === null && candidates.length === 1);
      if (!speaksToThisEvent) continue;

      const prices = [...seg.text.matchAll(PRICE_RE)].map((m) => Number(m[1]));
      let status = 'VERIFIED';
      let rule = `post mentions ${ev.day}`;

      const closed = seg.text.match(CLOSED_RE);
      const special = seg.text.match(SPECIAL_RE);
      if (closed) {
        status = 'CANCELLED';
        rule = `"${closed[0]}" in the ${ev.day} line`;
      } else if (typeof ev.price_usd === 'number' && prices.length && !prices.includes(ev.price_usd)) {
        status = 'CHANGED';
        rule = `IG says $${prices.join('/$')}, calendar says $${ev.price_usd}`;
      } else if (special) {
        status = 'CHANGED';
        rule = `special night: "${special[0]}"`;
      }

      await es.update({
        index: IDX.events,
        id: ev.id,
        doc: {
          status,
          evidence: {
            post_url: post.url,
            posted_at: post.taken_at,
            handle: post.handle,
            snippet: seg.text.trim().slice(0, 220),
            image: post.image ?? null,
            is_reel: !!post.is_reel,
            rule,
          },
          last_checked: new Date().toISOString(),
        },
      });
      await es.update({ index: IDX.posts, id: post._id, doc: { matched_event: ev.id } }).catch(() => {});
      tally[status] = (tally[status] ?? 0) + 1;
      n++;
      console.log(`  ${status.padEnd(9)} ${ev.id.padEnd(28)} ${rule}`);
    }
  }
}

await es.indices.refresh({ index: IDX.events });
console.log(`\nverdicts: ${n}`, tally, `· today in Austin: ${todayAustin()}`);

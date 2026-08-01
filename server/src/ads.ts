// Canonical ingest: austindancesocials.com ships its full events[] + venues[]
// arrays inside its Next.js chunks — including per-event `instagramUrl`.
// That gives us the whole Austin dance calendar AND the IG handles the agent
// then watches for real-time changes. robots.txt allows all.
//
// Usage: npm run ads   → rewrites seed/events.json + seed/sources.json
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://austindancesocials.com';

// Hand-verified venue → Instagram map (sources/Insta_profile_sources.json).
// ADS only carries instagramUrl for some events; this fills the rest so the
// agent can watch every venue that has a public account.
type IgSource = { name: string; instagram: string | null; confidence?: string; group?: string };
const igSources: IgSource[] = JSON.parse(
  readFileSync(new URL('../../sources/Insta_profile_sources.json', import.meta.url), 'utf8')
).sources;

const norm = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').replace(/\b(the|a|austin|atx|dance|co|company|studios?|hall|saloon|club|nightclub|bar)\b/g, ' ').replace(/\s+/g, ' ').trim();

const IG_BY_VENUE = new Map<string, string>();
for (const s of igSources) {
  if (!s.instagram || s.group === 'aggregators') continue; // aggregator accounts aren't venue truth
  const k = norm(s.name);
  if (k) IG_BY_VENUE.set(k, s.instagram.toLowerCase());
}

/** JS source has JSON in nested string escapes — peel them before scanning. */
const unescape = (s: string) =>
  s.replace(/\\\\"/g, '"').replace(/\\\\'/g, "'").replace(/\\"/g, '"').replace(/\\'/g, "'");

/** Pull every balanced {...} that starts at `"id":"` — the shape both arrays use. */
function extractObjects(src: string): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  const re = /\{"id":"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = m.index; i < src.length; i++) {
      const ch = src[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { out.push(JSON.parse(src.slice(m.index, i + 1))); } catch { /* partial — skip */ }
          break;
        }
      }
    }
  }
  return out;
}

const DAY: Record<string, string> = {
  sunday: 'SUN', monday: 'MON', tuesday: 'TUE', wednesday: 'WED',
  thursday: 'THU', friday: 'FRI', saturday: 'SAT',
};

const handleOf = (url?: string) =>
  url ? (url.match(/instagram\.com\/([A-Za-z0-9._]+)/)?.[1] ?? '').toLowerCase() : '';

// Neighborhood centroids — enough to place a pin on a city map without a
// geocoding key. Venue address is shown verbatim in the popup.
const AREA_GEO: Record<string, [number, number]> = {
  'allandale': [30.3510, -97.7390],
  'east austin': [30.2650, -97.7220],
  'south austin': [30.2120, -97.7830],
  'south lamar': [30.2450, -97.7810],
  'south congress': [30.2480, -97.7510],
  'north austin': [30.3800, -97.7180],
  'north loop': [30.3180, -97.7220],
  'downtown': [30.2680, -97.7430],
  'east riverside': [30.2380, -97.7130],
  'cedar park': [30.5050, -97.8200],
  'round rock': [30.5080, -97.6790],
  'georgetown': [30.6330, -97.6770],
  'the domain': [30.4010, -97.7250],
  'mueller': [30.2990, -97.7050],
  'westlake': [30.2830, -97.8060],
  'central austin': [30.2950, -97.7420],
  'hyde park': [30.3050, -97.7300],
  'cherrywood': [30.2900, -97.7130],
  'zilker': [30.2640, -97.7700],
  'west austin': [30.2870, -97.7690],
  'clarksville / west austin': [30.2790, -97.7620],
  'ut campus / downtown': [30.2860, -97.7390],
  'university hills': [30.3080, -97.6790],
  'northwest austin': [30.4200, -97.7550],
  'east austin (springdale station)': [30.2720, -97.6930],
  'lake travis (nw of austin)': [30.4300, -97.9200],
  'pflugerville': [30.4390, -97.6200],
  'san marcos': [29.8830, -97.9410],
  'austin': [30.2672, -97.7431],
};
/** Deterministic jitter so venues in the same neighborhood don't stack. */
function geoFor(area: string, id: string): { lat: number; lon: number } {
  const key = area.toLowerCase().trim();
  const base = AREA_GEO[key] ?? AREA_GEO['austin'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const dLat = (((h % 1000) / 1000) - 0.5) * 0.022;
  const dLon = ((((h >> 10) % 1000) / 1000) - 0.5) * 0.026;
  return { lat: +(base[0] + dLat).toFixed(5), lon: +(base[1] + dLon).toFixed(5) };
}

const html = await (await fetch(ORIGIN)).text();
const chunks = [...new Set([...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+)"/g)].map((m) => m[1]))];
console.log(`chunks on page: ${chunks.length}`);

const objects: Record<string, any>[] = [];
for (const c of chunks) {
  const js = await (await fetch(ORIGIN + c)).text();
  if (!/"venueId"|"neighborhood"/.test(js)) continue;
  const found = extractObjects(unescape(js));
  console.log(`  ${c} → ${found.length} objects`);
  objects.push(...found);
}

const venues = new Map<string, any>();
const rawEvents: Record<string, any>[] = [];
for (const o of objects) {
  if (o.venueId && o.dayOfWeek) rawEvents.push(o);
  else if (o.address && o.city) venues.set(o.id, o);
}
console.log(`parsed: ${rawEvents.length} events · ${venues.size} venues`);

// One-time events carry a `date`; recurring ones don't. Drop past one-offs —
// a February showcase is not "what's on this week".
const TODAY = new Date().toISOString().slice(0, 10);

const events = rawEvents
  .filter((e) => e.isActive !== false)
  .filter((e) => !e.date || e.date >= TODAY)
  .map((e) => {
    const v = venues.get(e.venueId) ?? {};
    const venueName = v.name ?? '';
    const igHandle =
      handleOf(e.instagramUrl) ||
      handleOf(v.instagramUrl) ||
      IG_BY_VENUE.get(norm(venueName)) ||
      // Fall back to a loose containment match ("Mavericks" ↔ "Mavericks Dance Hall").
      [...IG_BY_VENUE.entries()].find(
        ([k]) => k.length > 3 && (norm(venueName).includes(k) || k.includes(norm(venueName)))
      )?.[1] ||
      '';
    const styles: string[] = (e.danceStyles ?? []).map((s: string) => s.toLowerCase());
    const price = typeof e.coverCharge === 'number' ? e.coverCharge : null;
    const area = v.neighborhood ?? v.city ?? 'Austin';
    return {
      id: e.id,
      name: e.name,
      venue: v.name ?? e.venueId,
      area,
      location: geoFor(area, e.venueId ?? e.id),
      location_approx: true,
      address: [v.address, v.city, v.zipCode].filter(Boolean).join(', ') || undefined,
      day: DAY[String(e.dayOfWeek).toLowerCase()] ?? 'FRI',
      date: e.date ?? undefined,
      recurring: !e.date,
      start: e.startTime ?? '',
      end: e.endTime ?? undefined,
      styles,
      live_music: !!e.hasLiveMusic,
      lesson: !!e.hasLesson,
      skill_level: e.skillLevel ?? undefined,
      price_usd: price,
      price_note: [
        price === 0 ? 'Free!' : price != null ? `$${price}` : 'Cover varies',
        e.priceNotes, e.notes,
      ].filter(Boolean).join(' · '),
      organizer: e.organizer ?? undefined,
      instructor: e.instructor ?? undefined,
      website: e.websiteUrl ?? v.websiteUrl ?? undefined,
      maps_url: v.googleMapsUrl ?? undefined,
      ig_handle: igHandle || undefined,
      ig_url: e.instagramUrl ?? v.instagramUrl ?? undefined,
      source: 'austindancesocials.com',
      // One string for ELSER to embed: everything a human would say out loud.
      blurb: [
        e.name, `at ${v.name ?? ''} in ${v.neighborhood ?? 'Austin'}`,
        `${e.dayOfWeek}s ${e.startTime ?? ''}`,
        styles.join(', ') + ' dancing',
        e.hasLesson ? 'lesson included' : '',
        e.hasLiveMusic ? 'live music' : '',
        e.skillLevel === 'all' || e.skillLevel === 'beginner' ? 'beginner friendly, no partner needed' : '',
        price === 0 ? 'free, no cover' : price != null ? `$${price} cover` : '',
        e.description ?? '', e.longDescription ?? '',
      ].filter(Boolean).join('. ').replace(/\s+/g, ' ').slice(0, 1800),
    };
  });

// Venues we can watch on Instagram — the agent's eyes get pointed here.
const handles = [...new Set(events.map((e) => e.ig_handle).filter(Boolean))] as string[];

writeFileSync(new URL('../seed/events.json', import.meta.url), JSON.stringify(events, null, 2));
writeFileSync(
  new URL('../seed/sources.json', import.meta.url),
  JSON.stringify(
    {
      instagram_handles: handles,
      crawl_urls: [ORIGIN, `${ORIGIN}/salsa`, `${ORIGIN}/country`, `${ORIGIN}/tango`, `${ORIGIN}/swing`],
      _generated_by: 'npm run ads',
    },
    null,
    2
  )
);

const byDay = events.reduce<Record<string, number>>((a, e) => ({ ...a, [e.day]: (a[e.day] ?? 0) + 1 }), {});
console.log(`\nwrote ${events.length} active events · ${handles.length} IG handles`);
console.log('by day:', byDay);
console.log('handles:', handles.join(', '));

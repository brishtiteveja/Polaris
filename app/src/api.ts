// Polaris API client. Simulator shares the Mac's loopback, so localhost works.
// On a physical phone, set EXPO_PUBLIC_API_URL to the Mac's LAN IP.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8791';
export const API_BASE = BASE;

export interface EventDoc {
  id: string;
  name: string;
  venue: string;
  area: string;
  day: string;
  start: string;
  end?: string;
  styles: string[];
  live_music?: boolean;
  lesson?: boolean;
  price_usd: number | null;
  price_note?: string;
  organizer?: string;
  address?: string;
  ig_handle?: string;
  status?: 'VERIFIED' | 'CHANGED' | 'CANCELLED' | 'UNVERIFIED';
  evidence?: { post_url?: string; posted_at?: string; snippet?: string; rule?: string; image?: string; is_reel?: boolean };
  hero_image?: string;
  ig_profile?: string;
  ig_reel?: string;
  website?: string;
  maps_url?: string;
  last_checked?: string;
  rsvp_count?: number;
  location?: { lat: number; lon: number };
}

export interface AskResult {
  answer: string;
  events: EventDoc[];
  citations: { label: string; url: string }[];
}

/**
 * Instagram CDN images are blocked cross-origin in browsers, so on web we route
 * them through the API. Native fetches them directly.
 */
export function imageUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const isWeb = typeof document !== 'undefined';
  return isWeb ? `${BASE}/img?u=${encodeURIComponent(raw)}` : raw;
}

export async function getFeed(params: { day?: string; style?: string; maxPrice?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.day && params.day !== 'ALL') qs.set('day', params.day);
  if (params.style && params.style !== 'all') qs.set('style', params.style);
  if (params.maxPrice != null) qs.set('maxPrice', String(params.maxPrice));
  const r = await fetch(`${BASE}/feed?${qs}`);
  if (!r.ok) throw new Error(`feed ${r.status}`);
  return (await r.json()) as { today: string; events: EventDoc[] };
}

export async function ask(q: string) {
  const r = await fetch(`${BASE}/ask?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error(`ask ${r.status}`);
  return (await r.json()) as AskResult;
}

export interface Reel {
  url: string;
  embed: string;
  handle: string;
  caption: string;
  image: string | null;
  taken_at?: string;
  likes: number | null;
}

export async function getReels() {
  const r = await fetch(`${BASE}/reels`);
  if (!r.ok) throw new Error(`reels ${r.status}`);
  return (await r.json()) as { reels: Reel[] };
}

export async function rsvp(id: string) {
  const r = await fetch(`${BASE}/rsvp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!r.ok) throw new Error(`rsvp ${r.status}`);
  return (await r.json()) as { id: string; rsvp_count: number };
}

// Shared Elastic client + index names. Env comes from the repo-root .env.
import { Client } from '@elastic/elasticsearch';
import { config } from 'dotenv';

config({ path: new URL('../../.env', import.meta.url).pathname });
config(); // fallback: cwd .env

const url = process.env.ELASTIC_URL;
const apiKey = process.env.ELASTIC_API_KEY;
if (!url || !apiKey) {
  console.error('Missing ELASTIC_URL / ELASTIC_API_KEY in .env — create a Serverless Search project (ela.st/hack-austin), then Home → Endpoints & API keys.');
  process.exit(1);
}

export const es = new Client({ node: url, auth: { apiKey } });

export const IDX = {
  events: 'events',
  posts: 'ig_posts',
  pages: 'web_pages',
} as const;

/** Weekday code (FRI, SAT…) for a timestamp, in Austin time. */
export function austinDay(ts: string | number | Date): string {
  return new Date(ts)
    .toLocaleString('en-US', { weekday: 'short', timeZone: 'America/Chicago' })
    .toUpperCase();
}

export function todayAustin(): string {
  return austinDay(new Date());
}

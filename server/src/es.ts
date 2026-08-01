// Shared Elastic client + index names. Env comes from the repo-root .env.
import { Client } from '@elastic/elasticsearch';
import { config } from 'dotenv';

config({ path: new URL('../../.env', import.meta.url).pathname });
config(); // fallback: cwd .env

const url = process.env.ELASTIC_URL;
const apiKey = process.env.ELASTIC_API_KEY;

/** False when creds are absent — the API then serves the seed file directly. */
export const esConfigured = Boolean(url && apiKey);

export const es = esConfigured
  ? new Client({ node: url!, auth: { apiKey: apiKey! } })
  : (null as unknown as Client);

/** Scripts that genuinely need Elastic call this first. */
export function requireEs(): void {
  if (esConfigured) return;
  console.error(
    'Missing ELASTIC_URL / ELASTIC_API_KEY in .env\n' +
      '  → create a Serverless Search project at https://ela.st/hack-austin,\n' +
      '    then Home → "Endpoints & API keys", and put both in /Users/andy/dev/Polaris/.env'
  );
  process.exit(1);
}

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

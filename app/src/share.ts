import { Platform, Share, Linking } from 'react-native';
import type { EventDoc } from './api';

const DAY_NAME: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday',
  FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};

const clock = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
};

/** What someone actually wants pasted into a group chat. */
export function shareText(e: EventDoc): string {
  const price = e.price_usd === 0 ? 'free' : e.price_usd != null ? `$${e.price_usd}` : 'cover varies';
  const verified =
    e.status === 'VERIFIED' ? '\n✓ Confirmed on their Instagram' :
    e.status === 'CHANGED' ? '\n⚠ Something changed — check their Instagram' : '';
  const link = e.evidence?.post_url ?? e.ig_profile ?? e.website ?? '';
  return [
    `${DAY_NAME[e.day] ?? e.day} · ${e.name}`,
    `${e.venue}, ${e.area} · ${clock(e.start)} · ${price}`,
    (e.styles ?? []).join(' · '),
    verified,
    link,
    '\nvia Polaris',
  ].filter(Boolean).join('\n');
}

/**
 * Share sheet on native; Web Share API on mobile browsers; clipboard fallback
 * on desktop (where navigator.share usually doesn't exist).
 */
export async function share(e: EventDoc): Promise<'shared' | 'copied' | 'failed'> {
  const message = shareText(e);
  try {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as any;
      if (nav?.share) {
        await nav.share({ title: e.name, text: message });
        return 'shared';
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(message);
        return 'copied';
      }
      return 'failed';
    }
    await Share.share({ message });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Open the venue's Instagram — the community lives there, not in our app. */
export function openInstagram(e: EventDoc) {
  const url = e.evidence?.post_url ?? e.ig_profile;
  if (url) Linking.openURL(url);
}

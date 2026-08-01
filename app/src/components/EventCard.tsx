import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, space } from '../theme';
import { imageUrl, type EventDoc } from '../api';

const STYLE_EMOJI: [RegExp, string][] = [
  [/two-step|country/, '🥾'],
  [/salsa/, '🔥'],
  [/bachata/, '🌺'],
  [/tango/, '🌹'],
  [/zouk|kizomba/, '🌊'],
  [/swing|lindy/, '🎷'],
  [/blues|fusion/, '💫'],
];
export const emojiFor = (styles: string[] = []) =>
  STYLE_EMOJI.find(([re]) => re.test(styles.join(' ')))?.[1] ?? '💃';

export const priceLabel = (e: EventDoc) =>
  e.price_usd === 0 ? 'Free!' : e.price_usd != null ? `$${e.price_usd}` : 'Varies';

const clock = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const ago = (iso?: string) => {
  if (!iso) return '';
  const hrs = (Date.now() - new Date(iso).getTime()) / 36e5;
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${Math.round(hrs)}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

/** The whole point of Polaris: what Instagram says about this night, right now. */
function Badge({ e }: { e: EventDoc }) {
  const map = {
    VERIFIED: { fg: colors.verdigris, bg: colors.verdigrisSoft, label: `✓ IG-verified ${ago(e.evidence?.posted_at)}` },
    CHANGED: { fg: colors.amber, bg: 'rgba(255,176,32,0.14)', label: '⚠ Changed — check IG' },
    CANCELLED: { fg: colors.danger, bg: 'rgba(242,84,91,0.12)', label: '✕ Cancelled per IG' },
    UNVERIFIED: { fg: colors.muted, bg: 'rgba(123,113,137,0.10)', label: 'Not yet verified' },
  }[e.status ?? 'UNVERIFIED'];

  const url = e.evidence?.post_url;
  return (
    <Pressable
      disabled={!url}
      onPress={() => url && Linking.openURL(url)}
      style={[styles.badge, { backgroundColor: map.bg }]}
    >
      <Text style={[styles.badgeText, { color: map.fg }]}>
        {map.label}{url ? '  ↗' : ''}
      </Text>
    </Pressable>
  );
}

export function EventCard({
  e, saved, onSave,
}: {
  e: EventDoc;
  saved?: boolean;
  onSave?: () => void;
}) {
  const cancelled = e.status === 'CANCELLED';
  // Instagram CDN URLs are signed and expire after a few hours — a re-run of
  // `pulse` refreshes them. Cards without one just render without a photo.
  const hero = imageUrl(e.evidence?.image ?? e.hero_image);

  return (
    <View style={[styles.card, cancelled && styles.cardOff]}>
      {hero ? (
        <Pressable
          onPress={() => Linking.openURL(e.evidence?.post_url ?? e.ig_profile ?? '')}
          style={styles.heroWrap}
        >
          <ImageBackground source={{ uri: hero }} style={styles.hero} imageStyle={styles.heroImg}>
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']}
              style={StyleSheet.absoluteFill}
            />
            {e.ig_handle ? (
              <View style={styles.igTag}>
                <Text style={styles.igTagText}>@{e.ig_handle}</Text>
              </View>
            ) : null}
            {e.evidence?.is_reel || e.ig_reel ? (
              <View style={styles.reelTag}><Text style={styles.reelText}>▶ Reel</Text></View>
            ) : null}
          </ImageBackground>
        </Pressable>
      ) : null}

      <View style={styles.topRow}>
        <Text style={styles.time}>
          {emojiFor(e.styles)}  {clock(e.start)}
        </Text>
        <Text style={[styles.price, e.price_usd === 0 && { color: colors.verdigris }]}>{priceLabel(e)}</Text>
      </View>

      <Text style={[styles.name, cancelled && styles.strike]} numberOfLines={2}>{e.name}</Text>
      <Text style={styles.venue} numberOfLines={1}>{e.venue}</Text>
      <Text style={styles.area} numberOfLines={1}>
        {e.area}{e.lesson ? ' · lesson' : ''}{e.live_music ? ' · live music' : ''}
      </Text>

      <View style={styles.chips}>
        {(e.styles ?? []).slice(0, 4).map((s) => (
          <View key={s} style={styles.chip}><Text style={styles.chipText}>{s}</Text></View>
        ))}
      </View>

      <Badge e={e} />

      {e.evidence?.snippet ? (
        <Text style={styles.snippet} numberOfLines={2}>“{e.evidence.snippet}”</Text>
      ) : null}

      <View style={styles.footer}>
        <Pressable onPress={onSave} hitSlop={8} style={[styles.save, saved && styles.saveOn]}>
          <Text style={[styles.saveText, saved && { color: colors.night }]}>
            {saved ? '✓ Going' : '+ Count me in'}
          </Text>
        </Pressable>
        {e.ig_profile ? (
          <Pressable onPress={() => Linking.openURL(e.ig_profile!)} hitSlop={8}>
            <Text style={styles.igLink}>Instagram ↗</Text>
          </Pressable>
        ) : null}
        {e.rsvp_count ? <Text style={styles.going}>{e.rsvp_count} going</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(2),
    gap: 5,
    overflow: 'hidden',
    ...shadow.card,
  },
  heroWrap: { marginHorizontal: -space(2), marginTop: -space(2), marginBottom: space(1) },
  hero: { height: 168, justifyContent: 'flex-end' },
  heroImg: { resizeMode: 'cover' },
  igTag: {
    position: 'absolute', left: space(1.5), bottom: space(1.25),
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10,
  },
  igTagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  reelTag: {
    position: 'absolute', right: space(1.5), top: space(1.25),
    backgroundColor: 'rgba(255,79,110,0.92)', borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10,
  },
  reelText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' },
  igLink: { color: colors.lamp, fontSize: 12.5, fontWeight: '700' },
  cardOff: { opacity: 0.72, borderColor: 'rgba(242,84,91,0.35)' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { color: colors.bone, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  price: { color: colors.lamp, fontSize: 15, fontWeight: '800' },
  name: { color: colors.bone, fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginTop: 2 },
  strike: { textDecorationLine: 'line-through' },
  venue: { color: colors.lamp, fontSize: 14.5, fontWeight: '600' },
  area: { color: colors.muted, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { backgroundColor: colors.panelHi, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 9 },
  chipText: { color: colors.bone, fontSize: 11.5, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10, marginTop: 6 },
  badgeText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.2 },
  snippet: { color: colors.muted, fontSize: 12, fontStyle: 'italic', lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), marginTop: 6 },
  save: { borderWidth: 1.2, borderColor: colors.lineStrong, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  saveOn: { backgroundColor: colors.lamp, borderColor: colors.lamp },
  saveText: { color: colors.bone, fontSize: 13, fontWeight: '700' },
  going: { color: colors.muted, fontSize: 12 },
});

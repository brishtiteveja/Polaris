import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, Pressable, Linking, ActivityIndicator, ImageBackground,
} from 'react-native';
import { colors, radius, shadow, space } from '../theme';
import { getReels, imageUrl, type Reel } from '../api';

/**
 * Instagram serves a public embed player at /reel/<code>/embed, so reels play
 * inline on web with no Instagram auth and nothing rehosted — we only ever hold
 * the public post URL. Native has no WebView in this binary, so it shows the
 * poster frame and hands off to the Instagram app on tap.
 */
export function ReelsScreen() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getReels()
      .then((r) => setReels(r.reels))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.lamp} /></View>;
  if (err) return <View style={styles.center}><Text style={styles.err}>{err}</Text></View>;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.h1}>
          Reels from <Text style={{ color: colors.lamp }}>the floor</Text>
        </Text>
        <Text style={styles.sub}>{reels.length} clips pulled from Austin dance accounts</Text>
      </View>

      <ScrollView contentContainerStyle={styles.feed} showsVerticalScrollIndicator={false}>
        {reels.map((r) => (
          <View key={r.url} style={styles.card}>
            <View style={styles.byline}>
              <Text style={styles.handle}>@{r.handle}</Text>
              <Pressable onPress={() => Linking.openURL(r.url)} hitSlop={8}>
                <Text style={styles.open}>Open ↗</Text>
              </Pressable>
            </View>

            {Platform.OS === 'web' ? (
              React.createElement('iframe', {
                src: r.embed,
                style: { border: 'none', width: '100%', height: 560, borderRadius: 14, background: '#000' },
                allow: 'autoplay; encrypted-media; picture-in-picture',
                allowFullScreen: true,
                scrolling: 'no',
                title: `reel by ${r.handle}`,
              })
            ) : (
              <Pressable onPress={() => Linking.openURL(r.url)}>
                <ImageBackground
                  source={{ uri: imageUrl(r.image ?? undefined) }}
                  style={styles.poster}
                  imageStyle={{ borderRadius: 14 }}
                >
                  <View style={styles.play}><Text style={styles.playGlyph}>▶</Text></View>
                </ImageBackground>
              </Pressable>
            )}

            {r.caption ? <Text style={styles.caption} numberOfLines={3}>{r.caption}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ground },
  head: { paddingHorizontal: space(2.5), paddingTop: space(1.5), gap: 2 },
  h1: { color: colors.bone, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  sub: { color: colors.muted, fontSize: 13 },
  feed: { padding: space(2.5), paddingBottom: space(13), gap: space(2) },
  card: {
    backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    padding: space(1.5), gap: space(1), ...shadow.card,
  },
  byline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  handle: { color: colors.bone, fontSize: 14, fontWeight: '800' },
  open: { color: colors.lamp, fontSize: 12.5, fontWeight: '700' },
  poster: { height: 380, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelHi },
  play: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  playGlyph: { color: '#FFFFFF', fontSize: 24, marginLeft: 3 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ground },
  err: { color: colors.danger, fontSize: 14 },
});

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { colors, radius, space } from '../theme';
import { API_BASE } from '../api';

/**
 * The city map lives in the API's own page (MapLibre + CARTO dark tiles), so
 * both the app and the site share one implementation. On web we embed it; on
 * native there's no map dependency in this binary, so we hand off to the browser.
 */
export function MapScreen() {
  const url = `${API_BASE}/map`;

  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      src: url,
      style: { border: 'none', width: '100%', height: '100%', background: colors.ground },
      title: 'Austin dance map',
    });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.glyph}>🗺️</Text>
      <Text style={styles.h1}>The map lives in your browser</Text>
      <Text style={styles.body}>
        Every venue pinned across Austin, ringed by what Instagram says about tonight.
      </Text>
      <Pressable onPress={() => Linking.openURL(url)} style={styles.btn}>
        <Text style={styles.btnText}>Open the map ↗</Text>
      </Pressable>
      <Text style={styles.hint}>{url}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(1.25), padding: space(4), backgroundColor: colors.ground },
  glyph: { fontSize: 52 },
  h1: { color: colors.bone, fontSize: 21, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  body: { color: colors.muted, fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  btn: { backgroundColor: colors.lamp, borderRadius: radius.pill, paddingVertical: space(1.5), paddingHorizontal: space(3), marginTop: space(1) },
  btnText: { color: colors.night, fontSize: 15, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 11.5, marginTop: space(0.5) },
});

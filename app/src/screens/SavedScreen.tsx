import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, space } from '../theme';
import type { EventDoc } from '../api';
import { EventCard } from '../components/EventCard';

export function SavedScreen({
  events, onToggleSave,
}: {
  events: EventDoc[];
  onToggleSave: (e: EventDoc) => void;
}) {
  const cancelled = events.filter((e) => e.status === 'CANCELLED');

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.h1}>Your nights</Text>
        <Text style={styles.sub}>
          {events.length === 0
            ? 'Nothing saved yet.'
            : `${events.length} saved${cancelled.length ? ` · ${cancelled.length} needs your attention` : ' · all still on'}`}
        </Text>
      </View>

      {cancelled.length ? (
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>Heads up</Text>
          <Text style={styles.alertBody}>
            {cancelled.map((e) => e.name).join(', ')} — Instagram says it's off. Tap the badge for the post.
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {events.map((e) => (
          <EventCard key={e.id} e={e} saved onSave={() => onToggleSave(e)} />
        ))}
        {events.length === 0 ? (
          <Text style={styles.empty}>
            Tap “Count me in” on any night and it lands here. Polaris keeps watching Instagram and
            tells you if it changes.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ground },
  head: { paddingHorizontal: space(2.5), paddingTop: space(1.5), gap: 2 },
  h1: { color: colors.bone, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  sub: { color: colors.muted, fontSize: 13 },
  alert: {
    margin: space(2.5), marginBottom: 0, padding: space(2), borderRadius: 18,
    backgroundColor: 'rgba(242,84,91,0.10)', borderWidth: 1, borderColor: 'rgba(242,84,91,0.35)', gap: 3,
  },
  alertTitle: { color: colors.danger, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  alertBody: { color: colors.bone, fontSize: 13.5, lineHeight: 19 },
  list: { padding: space(2.5), paddingBottom: space(13), gap: space(1.5) },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', paddingHorizontal: space(2), paddingTop: space(4) },
});

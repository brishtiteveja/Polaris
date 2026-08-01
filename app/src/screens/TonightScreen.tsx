import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { colors, space } from '../theme';
import { getFeed, rsvp, type EventDoc } from '../api';
import { EventCard } from '../components/EventCard';
import { DAYS, STYLES, PillRow } from '../components/Filters';

const DAY_LABEL: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday',
  FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};

export function TonightScreen({
  saved, onToggleSave,
}: {
  saved: string[];
  onToggleSave: (e: EventDoc) => void;
}) {
  // Open on tonight — that's the question the app exists to answer.
  const [day, setDay] = useState(
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()]
  );
  const [style, setStyle] = useState('all');
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [today, setToday] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await getFeed({ day, style });
      setEvents(r.events);
      setToday(r.today);
    } catch (e: any) {
      setError(e.message ?? 'offline');
    } finally {
      setLoading(false);
    }
  }, [day, style]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const verified = events.filter((e) => e.status && e.status !== 'UNVERIFIED').length;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.h1}>
          {day === today ? 'Tonight in ' : `${DAY_LABEL[day] ?? 'All week'} in `}
          <Text style={{ color: colors.lamp }}>Austin</Text>
        </Text>
        <Text style={styles.sub}>
          {loading ? 'Loading…' : `${events.length} socials · ${verified} checked against Instagram`}
        </Text>
      </View>

      <PillRow items={DAYS.map((d) => ({ key: d, label: d === 'ALL' ? 'All days' : DAY_LABEL[d] ?? d }))} value={day} onChange={setDay} />
      <PillRow items={STYLES} value={style} onChange={setStyle} />

      {error ? (
        <View style={styles.center}>
          <Text style={styles.err}>Can't reach the Polaris API.</Text>
          <Text style={styles.errSub}>{error}{'\n'}Is `npm run api` running on :8787?</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.lamp} /></View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.lamp} />}
          renderItem={({ item, index }) => {
            const prev = events[index - 1];
            const header = day === 'ALL' && item.day !== prev?.day;
            return (
              <View style={{ gap: space(1.5) }}>
                {header ? (
                  <Text style={styles.dayHead}>
                    {DAY_LABEL[item.day] ?? item.day}
                    {item.day === today ? <Text style={styles.todayTag}>  TODAY</Text> : null}
                  </Text>
                ) : null}
                <EventCard
                  e={item}
                  saved={saved.includes(item.id)}
                  onSave={() => {
                    onToggleSave(item);
                    if (!saved.includes(item.id)) rsvp(item.id).catch(() => {});
                  }}
                />
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.errSub}>Nothing on for that filter.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ground },
  head: { paddingHorizontal: space(2.5), paddingTop: space(1.5), gap: 2 },
  h1: { color: colors.bone, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  sub: { color: colors.muted, fontSize: 13 },
  list: { padding: space(2.5), paddingTop: space(1), paddingBottom: space(13), gap: space(1.5) },
  dayHead: { color: colors.bone, fontSize: 19, fontWeight: '800', marginTop: space(1.5), letterSpacing: -0.3 },
  todayTag: { color: colors.lamp, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: space(3) },
  err: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  errSub: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});

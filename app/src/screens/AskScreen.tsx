import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Linking, ActivityIndicator,
} from 'react-native';
import { colors, radius, shadow, space } from '../theme';
import { ask, rsvp, type AskResult, type EventDoc } from '../api';
import { EventCard } from '../components/EventCard';

const SUGGESTIONS = [
  'beginner friendly country night',
  'free salsa this week',
  'tango practica north austin',
  'live music two-step under $10',
];

export function AskScreen({
  saved, onToggleSave,
}: {
  saved: string[];
  onToggleSave: (e: EventDoc) => void;
}) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clear = () => {
    setQ('');
    setRes(null);
    setErr(null);
  };

  const run = async (text: string) => {
    if (!text.trim()) return;
    setQ(text);
    setBusy(true);
    setErr(null);
    try {
      setRes(await ask(text));
    } catch (e: any) {
      setErr(e.message ?? 'failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.h1}>Ask Polaris</Text>
        <Text style={styles.sub}>Plain English. Searches meaning, not just keywords.</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => run(q)}
          placeholder="what's a chill dance night tonight?"
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="search"
        />
        {q || res ? (
          <Pressable onPress={clear} style={styles.clear} hitSlop={6}>
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => run(q)} style={styles.go}>
          <Text style={styles.goText}>Ask</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!res && !busy ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.tryLabel}>Try</Text>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => run(s)} style={styles.suggest}>
                <Text style={styles.suggestText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {busy ? <ActivityIndicator color={colors.lamp} style={{ marginTop: space(3) }} /> : null}
        {err ? <Text style={styles.err}>{err} — is the API running?</Text> : null}

        {res ? (
          <>
            <View style={styles.answer}>
              <Text style={styles.answerLabel}>
                {res.events.length ? `${res.events.length} matches` : 'No matches'}
              </Text>
              {res.events.length ? (
                res.events.slice(0, 3).map((e) => (
                  <View key={e.id} style={styles.line}>
                    <Text style={styles.lineName}>{e.name}</Text>
                    <Text style={styles.lineMeta}>
                      {e.venue} · {e.area} · {e.day} {e.start} ·{' '}
                      {e.price_usd === 0 ? 'free' : e.price_usd != null ? `$${e.price_usd}` : 'cover varies'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.lineMeta}>Try another style, day, or area.</Text>
              )}
            </View>

            {res.citations.length ? (
              <View style={styles.cites}>
                <Text style={styles.tryLabel}>Sources</Text>
                <View style={styles.citeRow}>
                  {res.citations.slice(0, 6).map((c, i) => (
                    <Pressable key={i} onPress={() => Linking.openURL(c.url)} style={styles.cite}>
                      <Text style={styles.citeText}>{c.label} ↗</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {res.events.map((e) => (
              <EventCard
                key={e.id}
                e={e}
                saved={saved.includes(e.id)}
                onSave={() => {
                  onToggleSave(e);
                  if (!saved.includes(e.id)) rsvp(e.id).catch(() => {});
                }}
              />
            ))}
          </>
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
  inputRow: { flexDirection: 'row', gap: 8, padding: space(2.5), paddingBottom: space(1) },
  input: {
    flex: 1, backgroundColor: colors.panel, borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.line, paddingHorizontal: space(2), paddingVertical: space(1.5),
    color: colors.bone, fontSize: 14.5,
  },
  go: {
    backgroundColor: colors.lamp, borderRadius: radius.pill, paddingHorizontal: space(2.5),
    alignItems: 'center', justifyContent: 'center',
  },
  goText: { color: colors.night, fontWeight: '800', fontSize: 14.5 },
  body: { padding: space(2.5), paddingTop: 0, paddingBottom: space(13), gap: space(1.5) },
  tryLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  suggest: {
    backgroundColor: colors.panel, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    padding: space(1.75),
  },
  suggestText: { color: colors.bone, fontSize: 14 },
  answer: {
    backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    borderLeftWidth: 4, borderLeftColor: colors.lamp,
    padding: space(2), gap: space(1.25), ...shadow.card,
  },
  answerLabel: {
    color: colors.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase',
  },
  line: { gap: 2 },
  lineName: { color: colors.bone, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  lineMeta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  clear: { width: 40, alignItems: 'center', justifyContent: 'center' },
  clearText: { color: colors.muted, fontSize: 17, fontWeight: '700' },
  cites: { gap: 8 },
  citeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cite: {
    backgroundColor: colors.panelHi, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 11,
  },
  citeText: { color: colors.bone, fontSize: 12, fontWeight: '700' },
  err: { color: colors.danger, fontSize: 13.5 },
});

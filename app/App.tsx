import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, shadow, space } from './src/theme';
import type { EventDoc } from './src/api';
import { TonightScreen } from './src/screens/TonightScreen';
import { AskScreen } from './src/screens/AskScreen';
import { SavedScreen } from './src/screens/SavedScreen';

type Tab = 'tonight' | 'ask' | 'saved';

export default function App() {
  const [tab, setTab] = useState<Tab>('tonight');
  // Saved events are held whole so the Saved tab can show live verdicts.
  const [saved, setSaved] = useState<EventDoc[]>([]);
  const savedIds = saved.map((e) => e.id);

  const toggleSave = (e: EventDoc) =>
    setSaved((prev) => (prev.some((s) => s.id === e.id) ? prev.filter((s) => s.id !== e.id) : [...prev, e]));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.wordmark}>✦ POLARIS</Text>
        <Text style={styles.tag}>AUSTIN · DANCE</Text>
      </View>

      <View style={styles.body}>
        {tab === 'tonight' && <TonightScreen saved={savedIds} onToggleSave={toggleSave} />}
        {tab === 'ask' && <AskScreen />}
        {tab === 'saved' && <SavedScreen events={saved} onToggleSave={toggleSave} />}
      </View>

      <View style={styles.tabbar}>
        <Tab label="Tonight" glyph="✦" active={tab === 'tonight'} onPress={() => setTab('tonight')} />
        <Tab label="Ask" glyph="◎" active={tab === 'ask'} onPress={() => setTab('ask')} />
        <Tab label="Saved" glyph="♥" active={tab === 'saved'} badge={saved.length} onPress={() => setTab('saved')} />
      </View>
    </SafeAreaView>
  );
}

function Tab({
  label, glyph, active, onPress, badge,
}: {
  label: string; glyph: string; active: boolean; onPress: () => void; badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tab, active && styles.tabOn, { opacity: pressed ? 0.75 : 1 }]}
    >
      <Text style={[styles.tabGlyph, { color: active ? colors.night : colors.muted }]}>{glyph}</Text>
      {active ? <Text style={styles.tabLabel}>{label}</Text> : null}
      {!active && badge ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.night, paddingTop: Platform.OS === 'android' ? 28 : 0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space(2.5), paddingVertical: space(1.25),
    backgroundColor: colors.night, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  wordmark: { color: colors.bone, fontSize: 15, letterSpacing: 3.5, fontWeight: '800' },
  tag: { color: colors.muted, fontSize: 10.5, letterSpacing: 1.5, fontWeight: '700' },
  body: { flex: 1, backgroundColor: colors.ground },
  tabbar: {
    position: 'absolute', left: space(2), right: space(2),
    bottom: Platform.OS === 'ios' ? space(1) : space(1.5),
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 4, padding: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1, borderColor: colors.lineStrong, ...shadow.lift,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11, borderRadius: 999,
  },
  tabOn: { backgroundColor: colors.lamp },
  tabGlyph: { fontSize: 16, fontWeight: '800' },
  tabLabel: { fontSize: 13, fontWeight: '800', color: colors.night, letterSpacing: -0.1 },
  dot: { position: 'absolute', top: 9, right: '31%', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lamp },
});

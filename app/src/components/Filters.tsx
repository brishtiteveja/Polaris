import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, space } from '../theme';

export const DAYS = ['ALL', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const STYLES: { key: string; label: string }[] = [
  { key: 'all', label: 'All styles' },
  { key: 'two-step', label: '🥾 Two-Step' },
  { key: 'country', label: '🤠 Country' },
  { key: 'salsa', label: '🔥 Salsa' },
  { key: 'bachata', label: '🌺 Bachata' },
  { key: 'tango', label: '🌹 Tango' },
  { key: 'zouk', label: '🌊 Zouk' },
  { key: 'swing', label: '🎷 Swing' },
  { key: 'farmers market', label: '🥕 Markets' },
];

export function PillRow({
  items, value, onChange,
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={[styles.pill, on && styles.pillOn]}>
            <Text style={[styles.text, on && styles.textOn]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flexShrink:0 keeps the FlatList below from squeezing the pills and clipping their text.
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: 8, paddingHorizontal: space(2.5), paddingVertical: 6 },
  pill: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  pillOn: { backgroundColor: colors.lamp, borderColor: colors.lamp },
  text: { color: colors.bone, fontSize: 13.5, fontWeight: '700' },
  textOn: { color: colors.night },
});

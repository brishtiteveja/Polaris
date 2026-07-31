import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ViewStyle, TextStyle, ScrollView,
} from 'react-native';
import { colors, radius, shadow, space, type as t } from '../theme';

export function Eyebrow({ children, tone }: { children: React.ReactNode; tone?: 'lamp' | 'verdigris' | 'muted' | 'danger' }) {
  const color =
    tone === 'lamp' ? colors.lamp : tone === 'verdigris' ? colors.verdigris : tone === 'danger' ? colors.danger : colors.muted;
  return <Text style={[styles.eyebrow, { color, textTransform: 'uppercase' }]}>{children}</Text>;
}

export function Card({ children, style, lit, good }: { children: React.ReactNode; style?: ViewStyle; lit?: boolean; good?: boolean }) {
  return (
    <View
      style={[
        styles.card,
        lit && { borderColor: colors.lamp, backgroundColor: colors.lampSoft },
        good && { borderColor: colors.verdigris, backgroundColor: colors.verdigrisSoft },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label, onPress, kind = 'primary', disabled, style,
}: {
  label: string; onPress?: () => void; kind?: 'primary' | 'ghost' | 'good' | 'danger'; disabled?: boolean; style?: ViewStyle;
}) {
  const map = {
    primary: { bg: colors.lamp, fg: colors.night, border: colors.lamp },
    good: { bg: colors.verdigris, fg: colors.night, border: colors.verdigris },
    ghost: { bg: 'transparent', fg: colors.bone, border: colors.lineStrong },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  }[kind];
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: map.bg, borderColor: map.border, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.btnLabel, { color: map.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ children, tone }: { children: React.ReactNode; tone?: 'lamp' | 'verdigris' | 'muted' | 'danger' }) {
  const color =
    tone === 'lamp' ? colors.lamp : tone === 'verdigris' ? colors.verdigris : tone === 'danger' ? colors.danger : colors.muted;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{String(children)}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/** A big-number stat, used in results / observatory / season-end. */
export function Stat({ n, label, tone }: { n: number | string; label: string; tone?: 'lamp' | 'verdigris' | 'bone' }) {
  const color = tone === 'verdigris' ? colors.verdigris : tone === 'bone' ? colors.bone : colors.lamp;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statN, { color }]}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}
export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}
export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function H3({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h3}>{children}</Text>;
}

export function ScreenScroll({ children, padBottom }: { children: React.ReactNode; padBottom?: number }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ground }}
      contentContainerStyle={{ padding: space(2.5), paddingBottom: padBottom ?? space(13), gap: space(2) }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...t.eyebrow, marginBottom: space(1) },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space(2),
    gap: space(1.25),
    ...shadow.card,
  },
  btn: {
    borderWidth: 1.4,
    borderRadius: radius.pill,
    paddingVertical: space(1.5),
    paddingHorizontal: space(2.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: { fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space(0.5) },
  stat: { alignItems: 'center', flex: 1, gap: 3 },
  statN: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 15 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space(1) },
  body: { ...t.body, color: colors.bone },
  muted: { ...t.small, color: colors.muted },
  h1: { ...t.h1, color: colors.bone },
  h2: { ...t.h2, color: colors.bone },
  h3: { ...t.h3, color: colors.bone },
  seatWrap: { alignItems: 'center', width: 82, gap: 4 },
  seat: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ground },
  seatInitials: { fontSize: 18, fontWeight: '600', letterSpacing: 1 },
  seal: {
    position: 'absolute', bottom: 3, left: '50%', marginLeft: -5, width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.bone, borderWidth: 1.5, borderColor: colors.ground,
  },
  seatName: { color: colors.bone, fontSize: 13, fontWeight: '600' },
  seatSub: { color: colors.muted, fontSize: 10.5, letterSpacing: 0.5 },
});

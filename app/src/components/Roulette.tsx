import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { colors, radius, shadow, space } from '../theme';
import { rsvp, type EventDoc } from '../api';
import { EventCard, emojiFor } from './EventCard';
import { share } from '../share';

/**
 * "Just pick one for me." Spins through the filtered set and lands on a night.
 * Weighted, not uniform: IG-verified events are likelier to come up and
 * cancelled ones can't come up at all — the roulette inherits the agent's
 * knowledge rather than ignoring it.
 */
function weightedPick(events: EventDoc[]): EventDoc | null {
  const pool = events.filter((e) => e.status !== 'CANCELLED');
  if (!pool.length) return null;
  const weight = (e: EventDoc) =>
    e.status === 'VERIFIED' ? 3 : e.status === 'CHANGED' ? 2 : 1;
  const total = pool.reduce((s, e) => s + weight(e), 0);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= weight(e);
    if (r <= 0) return e;
  }
  return pool[pool.length - 1];
}

export function Roulette({
  visible, events, onClose, onSave, saved,
}: {
  visible: boolean;
  events: EventDoc[];
  onClose: () => void;
  onSave: (e: EventDoc) => void;
  saved: string[];
}) {
  const [spinning, setSpinning] = useState(true);
  const [current, setCurrent] = useState<EventDoc | null>(null);
  const [landed, setLanded] = useState<EventDoc | null>(null);
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setSpinning(true);
    setLanded(null);
    pop.setValue(0);

    const winner = weightedPick(events);
    if (!winner) { setSpinning(false); return; }

    // Flick through candidates, decelerating, then settle on the winner.
    let i = 0;
    let delay = 60;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setCurrent(events[i % events.length]);
      i++;
      delay *= 1.18;
      if (delay < 320) {
        timer = setTimeout(tick, delay);
      } else {
        setCurrent(winner);
        setLanded(winner);
        setSpinning(false);
        Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 70 }).start();
      }
    };
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
  }, [visible, events]);

  const again = () => {
    setLanded(null);
    setSpinning(true);
    pop.setValue(0);
    const winner = weightedPick(events);
    setTimeout(() => {
      setCurrent(winner);
      setLanded(winner);
      setSpinning(false);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 70 }).start();
    }, 520);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headRow}>
            <Text style={styles.title}>
              {spinning ? 'Finding your night…' : landed ? 'Go here.' : 'Nothing to pick from'}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {spinning ? (
            <View style={styles.spinner}>
              <Text style={styles.spinEmoji}>{emojiFor(current?.styles)}</Text>
              <Text style={styles.spinName} numberOfLines={1}>{current?.name ?? '—'}</Text>
              <Text style={styles.spinVenue} numberOfLines={1}>{current?.venue ?? ''}</Text>
            </View>
          ) : landed ? (
            <Animated.View
              style={{
                opacity: pop,
                transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              }}
            >
              <EventCard
                e={landed}
                saved={saved.includes(landed.id)}
                onSave={() => {
                  onSave(landed);
                  if (!saved.includes(landed.id)) rsvp(landed.id).catch(() => {});
                }}
              />
            </Animated.View>
          ) : (
            <Text style={styles.empty}>No events match your filters right now.</Text>
          )}

          {landed ? (
            <View style={styles.actions}>
              <Pressable onPress={again} style={[styles.btn, styles.ghost]}>
                <Text style={styles.ghostText}>↻ Spin again</Text>
              </Pressable>
              <Pressable onPress={() => share(landed)} style={[styles.btn, styles.primary]}>
                <Text style={styles.primaryText}>Share this ↗</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.foot}>
            IG-verified nights come up more often. Cancelled ones never do.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(42,31,53,0.55)', justifyContent: 'center', padding: space(2.5) },
  sheet: {
    backgroundColor: colors.ground, borderRadius: radius.xl, padding: space(2.5), gap: space(1.5),
    borderWidth: 1, borderColor: colors.line, ...shadow.lift,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.bone, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  close: { color: colors.muted, fontSize: 20, fontWeight: '700' },
  spinner: {
    alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space(5),
    backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
  },
  spinEmoji: { fontSize: 44 },
  spinName: { color: colors.bone, fontSize: 17, fontWeight: '800' },
  spinVenue: { color: colors.lamp, fontSize: 14, fontWeight: '600' },
  empty: { color: colors.muted, fontSize: 14, textAlign: 'center', paddingVertical: space(4) },
  actions: { flexDirection: 'row', gap: space(1.25) },
  btn: { flex: 1, borderRadius: radius.pill, paddingVertical: space(1.5), alignItems: 'center', borderWidth: 1.4 },
  ghost: { borderColor: colors.lineStrong, backgroundColor: 'transparent' },
  ghostText: { color: colors.bone, fontSize: 14.5, fontWeight: '700' },
  primary: { borderColor: colors.lamp, backgroundColor: colors.lamp },
  primaryText: { color: colors.night, fontSize: 14.5, fontWeight: '800' },
  foot: { color: colors.muted, fontSize: 11.5, textAlign: 'center' },
});

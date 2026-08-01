import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { colors, space } from '../theme';
import { LogoMark } from './Logo';

/**
 * Opening beat: the star spins out of nothing, settles, and the name fades up
 * under it. Runs once at launch — about 1.6s, then hands over to the app.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.2)).current;
  const word = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(spin, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(420),
          Animated.timing(word, { toValue: 1, duration: 420, useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(260),
      Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(({ finished }) => finished && onDone());
  }, []);

  return (
    <Animated.View style={[styles.wrap, { opacity: fade }]} pointerEvents="none">
      <Animated.View
        style={{
          transform: [
            { scale },
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['-220deg', '0deg'] }) },
          ],
        }}
      >
        <LogoMark size={112} />
      </Animated.View>

      <Animated.View
        style={{
          opacity: word,
          transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        }}
      >
        <Text style={styles.word}>POLARIS</Text>
        <Text style={styles.tag}>your guide to Austin</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(3),
    zIndex: 50,
  },
  word: { color: colors.bone, fontSize: 27, fontWeight: '800', letterSpacing: 8, textAlign: 'center' },
  tag: { color: colors.muted, fontSize: 13, letterSpacing: 1.2, textAlign: 'center', marginTop: 6 },
});

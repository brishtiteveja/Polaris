import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Path, Circle, G } from 'react-native-svg';
import { colors } from '../theme';

/**
 * The Polaris mark: a four-point north star — the one you navigate by — with a
 * soft halo, drawn with concave edges so it reads as a sparkle rather than a
 * plus sign. Pure vector so it stays crisp as a favicon or an app icon.
 */
export function LogoMark({ size = 28, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="star" x1="14" y1="6" x2="50" y2="58" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFC24B" />
          <Stop offset="0.45" stopColor="#FF6B7F" />
          <Stop offset="1" stopColor="#FF3D63" />
        </LinearGradient>
        <RadialGradient id="halo" cx="32" cy="32" r="30" gradientUnits="userSpaceOnUse">
          <Stop offset="0.35" stopColor="#FF4F6E" stopOpacity="0.30" />
          <Stop offset="1" stopColor="#FF4F6E" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {glow ? <Circle cx="32" cy="32" r="30" fill="url(#halo)" /> : null}

      {/* Long vertical axis, short horizontal — the classic navigational star. */}
      <Path
        d="M32 3
           C33.4 18.6 36.9 26.6 45.1 29.4
           L61 32
           L45.1 34.6
           C36.9 37.4 33.4 45.4 32 61
           C30.6 45.4 27.1 37.4 18.9 34.6
           L3 32
           L18.9 29.4
           C27.1 26.6 30.6 18.6 32 3 Z"
        fill="url(#star)"
      />

      {/* Two small companions: the rest of the sky. */}
      <G opacity={0.85}>
        <Circle cx="51" cy="14" r="2.6" fill="#FFC24B" />
        <Circle cx="14" cy="49" r="1.9" fill="#FF6B7F" />
      </G>
    </Svg>
  );
}

/** Mark + wordmark, for the app header. */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      <Text style={[styles.word, { fontSize: size * 0.62 }]}>POLARIS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { color: colors.bone, fontWeight: '800', letterSpacing: 3.5 },
});

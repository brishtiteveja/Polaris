import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface IconProps { color: string; size?: number; filled?: boolean }

/** Stacked cards — "This week". */
export function DeckIcon({ color, size = 24, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G rotation={-14} origin="12, 12">
        <Rect x="4" y="5" width="11" height="15" rx="3.2" stroke={color} strokeWidth={2} opacity={0.55} />
      </G>
      <Rect
        x="9" y="4" width="11" height="15" rx="3.2"
        stroke={color} strokeWidth={2} fill={filled ? color : 'none'} fillOpacity={filled ? 0.22 : 0}
      />
    </Svg>
  );
}

/** Heart — "Connections". */
export function HeartIcon({ color, size = 24, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7.2-4.6-9.2-9A5.2 5.2 0 0 1 12 6.6 5.2 5.2 0 0 1 21.2 11c-2 4.4-9.2 9-9.2 9Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.28 : 0}
      />
    </Svg>
  );
}

/** Radar sweep — "Observatory". */
export function PulseIcon({ color, size = 24, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} opacity={0.4} />
      <Circle cx="12" cy="12" r="4.6" stroke={color} strokeWidth={2} opacity={0.7} />
      <Circle cx="12" cy="12" r="1.7" fill={color} />
      <Path d="M12 12 19 6.2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {filled ? <Circle cx="18.6" cy="6.6" r="2" fill={color} opacity={0.6} /> : null}
    </Svg>
  );
}

/** Person — "Profile". */
export function PersonIcon({ color, size = 24, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.4" r="3.6" stroke={color} strokeWidth={2} fill={filled ? color : 'none'} fillOpacity={filled ? 0.28 : 0} />
      <Path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Sparkle — used on the match overlay. */
export function SparkIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l2.2 7.1L22 12l-7.8 2.9L12 22l-2.2-7.1L2 12l7.8-2.9L12 2Z" />
    </Svg>
  );
}

/** Chat bubble — message actions. */
export function ChatIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.6c0 4.2-4 7.4-9 7.4-1 0-2-.13-2.9-.37L4 20l1.2-3.4C3.8 15.3 3 13.5 3 11.6 3 7.4 7 4.2 12 4.2s9 3.2 9 7.4Z"
        stroke={color} strokeWidth={2} strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Check — confirmations. */
export function CheckIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 12.5 10 18 19.5 6.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** X — pass / let go. */
export function XIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Flag — safety report. */
export function FlagIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 21V4.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M5.5 5c2.2-1.4 4.4-1.4 6.6 0s4.4 1.4 6.6 0v8.4c-2.2 1.4-4.4 1.4-6.6 0s-4.4-1.4-6.6 0" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
    </Svg>
  );
}

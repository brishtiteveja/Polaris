// Design tokens lifted from the Roster slide deck (the lamp-lit "study at night"
// palette). Kept in one place so the app reads as one object.

export const colors = {
  night: '#FFFFFF', // top-level chrome / text on coloured buttons
  ground: '#FFF5F1', // warm page
  panel: '#FFFFFF', // cards
  panelHi: '#FFEDE6',
  bone: '#2A1F35', // primary text
  muted: '#7B7189', // secondary text
  lamp: '#FF4F6E', // primary — the coral the app is built around
  lampSoft: 'rgba(255,79,110,0.10)',
  verdigris: '#0FB98A', // yes / kept / graduated
  verdigrisSoft: 'rgba(15,185,138,0.12)',
  line: 'rgba(42,31,53,0.10)',
  lineStrong: 'rgba(42,31,53,0.18)',
  danger: '#F2545B',
  // accents for gradients and variety
  violet: '#7C5CFF',
  amber: '#FFB020',
  sky: '#37C2F0',
} as const;

export const font = {
  // Palatino-family display on the slides; on device we fall back gracefully.
  display: 'Palatino',
  body: 'System',
  mono: 'Courier',
} as const;

export const space = (n: number) => n * 8;

export const radius = { sm: 8, md: 14, lg: 22, xl: 28, pill: 999 } as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  lift: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
} as const;

export const type = {
  wordmark: { fontSize: 15, letterSpacing: 4, fontWeight: '600' as const },
  eyebrow: { fontSize: 11, letterSpacing: 2, fontWeight: '600' as const },
  h1: { fontSize: 30, fontWeight: '600' as const, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 19 },
  tiny: { fontSize: 11, letterSpacing: 1 },
} as const;

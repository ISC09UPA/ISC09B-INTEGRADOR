import { Platform, TextStyle } from 'react-native';

/** Paleta CasaLink: obsidiana + verde-lima "señal". Ámbar para avisos y rojo para alarma. */
export const colors = {
  bg: '#07090A',
  bg2: '#0B0E10',
  card: '#101315',
  card2: '#161A1D',
  line: '#232A2F',
  lineSoft: '#1A2024',
  text: '#F3F6F4',
  mute: '#8B979D',
  dim: '#5A656B',
  lime: '#C8FF3D',
  limeDeep: '#8FBF1F',
  limeBg: 'rgba(200,255,61,0.10)',
  limeLine: 'rgba(200,255,61,0.35)',
  amber: '#FFB547',
  amberBg: 'rgba(255,181,71,0.12)',
  warm: '#FFC857',
  warmBg: 'rgba(255,200,87,0.15)',
  red: '#FF4D5E',
  redBg: 'rgba(255,77,94,0.12)',
  redLine: 'rgba(255,77,94,0.45)',
  ok: '#3DFF9A',
};

export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}) as string;

export const radius = { s: 12, m: 18, l: 26, xl: 34 };

/** Estilos de texto reutilizables. */
export const t = {
  hero: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 } as TextStyle,
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.8 } as TextStyle,
  h2: { color: colors.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 } as TextStyle,
  body: { color: colors.text, fontSize: 15, fontWeight: '500' } as TextStyle,
  mute: { color: colors.mute, fontSize: 13, fontWeight: '500' } as TextStyle,
  label: {
    color: colors.mute,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  } as TextStyle,
  num: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  mono: { color: colors.mute, fontSize: 11.5, fontFamily: mono, letterSpacing: 0.4 } as TextStyle,
};

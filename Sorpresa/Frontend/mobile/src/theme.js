import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
export const C = { ink: '#16302f', mute: '#5f7776', bg: '#f4f8f8', line: '#d5e0e0', teal: '#0f766e', soft: '#d9f0ec', ok: '#15803d', okS: '#dcf5e3', bad: '#c2321f', badS: '#fbe3df', warn: '#b45309', warnS: '#fdeccd' };
export const CAP = 8;
export const hhmm = () => new Date().toTimeString().slice(0, 5);

export const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  body: { padding: 12, gap: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, fontSize: 15, color: C.ink },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lbl: { color: C.mute, fontSize: 12 },
  h2: { fontSize: 20, fontWeight: '700', color: C.ink },
  big: { fontSize: 24, fontWeight: '700', color: C.ink },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  btn: { backgroundColor: C.teal, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.teal },
  btnSec: { backgroundColor: '#fff' },
  btnT: { color: '#fff', fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: C.line, paddingVertical: 12 },
  tab: { textAlign: 'center', fontSize: 12, color: C.mute },
  alert: { borderLeftWidth: 4, borderColor: C.bad, backgroundColor: C.badS, borderRadius: 8, padding: 10 },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line, gap: 10, justifyContent: 'flex-start' },
  num: { minWidth: 36, textAlign: 'center', paddingVertical: 8, borderRadius: 9, backgroundColor: C.soft, color: C.teal, fontWeight: '700', overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden', marginTop: 6 },
  barI: { height: '100%' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 64, marginTop: 8 },
  col: { flex: 1, backgroundColor: C.teal, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  slot: { width: '30%', paddingVertical: 10, borderWidth: 1, borderColor: C.line, borderRadius: 8, alignItems: 'center' },
  ring: { width: 110, height: 110, borderRadius: 55, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', borderWidth: 10, borderColor: C.soft },
  qr: { width: 120, height: 120, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 4, borderColor: '#fff' },
  tvNow: { backgroundColor: C.teal, borderRadius: 16, padding: 24, gap: 4 },
  tvTurn: { color: '#fff', fontSize: 72, fontWeight: '800' },
  tvCons: { marginTop: 10, color: '#fff', fontSize: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
});

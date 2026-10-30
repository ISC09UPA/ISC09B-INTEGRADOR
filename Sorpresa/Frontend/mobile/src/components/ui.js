import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
import { C, st } from '../theme';

export const Card = ({ children, style }) => <View style={[st.card, style]}>{children}</View>;
export const Row = ({ children, style }) => <View style={[st.row, style]}>{children}</View>;
export const Lbl = ({ children }) => <Text style={st.lbl}>{children}</Text>;
export const Pill = ({ t, k = 'soft' }) => {
  const m = { soft: [C.soft, C.teal], ok: [C.okS, C.ok], bad: [C.badS, C.bad], warn: [C.warnS, C.warn] }[k];
  return <Text style={[st.pill, { backgroundColor: m[0], color: m[1] }]}>{t}</Text>;
};
export const Btn = ({ label, onPress, kind = 'pri', disabled }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8}
    style={[st.btn, kind === 'sec' && st.btnSec, kind === 'red' && { backgroundColor: C.bad }, disabled && { opacity: 0.4 }]}>
    <Text style={[st.btnT, kind === 'sec' && { color: C.teal }]}>{label}</Text>
  </TouchableOpacity>
);
export const Tabs = ({ items, value, onChange }) => (
  <View style={st.tabs}>
    {items.map((t) => (
      <TouchableOpacity key={t} style={{ flex: 1 }} onPress={() => onChange(t)}>
        <Text style={[st.tab, value === t && { color: C.teal, fontWeight: '700' }]}>{t}</Text>
      </TouchableOpacity>
    ))}
  </View>
);
export const Header = ({ title, sub, onBack }) => (
  <Row style={{ padding: 16, paddingBottom: 8 }}>
    <View><Lbl>{sub}</Lbl><Text style={st.h2}>{title}</Text></View>
    <TouchableOpacity onPress={onBack}><Text style={{ color: C.teal, fontWeight: '600' }}>Cerrar sesión</Text></TouchableOpacity>
  </Row>
);


export function Field({ label, value, onChange, secure, kb }) {
  return (
    <View style={{ gap: 4 }}>
      <Lbl>{label}</Lbl>
      <TextInput value={value} onChangeText={onChange} secureTextEntry={secure} keyboardType={kb} autoCapitalize="none" style={st.input} />
    </View>
  );
}

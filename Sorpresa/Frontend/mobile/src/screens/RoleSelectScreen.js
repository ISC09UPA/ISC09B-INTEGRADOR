import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
import { C, CAP, st } from '../theme';
import { Card, Row, Lbl, Pill, Btn, Tabs, Header, Field } from '../components/ui';

export default function RoleSelectScreen({ setRole, back }) {
  const opts = [['admin', 'Administrador', 'Estado, bitácora, usuarios y estadísticas'], ['doctor', 'Doctor / Personal', 'Fila y consultas'], ['paciente', 'Paciente', 'Citas, turno y pase de acceso'], ['tv', 'Pantalla de sala de espera', 'Monitor de la Raspberry Pi']];
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={[st.h2, { fontSize: 26, marginTop: 20 }]}>Consultorio Inteligente</Text>
      <Lbl>Prototipo interactivo · elige un rol</Lbl>
      {opts.map(([k, t, d]) => (
        <TouchableOpacity key={k} onPress={() => setRole(k)}>
          <Card><Text style={{ fontWeight: '700', fontSize: 16 }}>{t}</Text><Lbl>{d}</Lbl></Card>
        </TouchableOpacity>
      ))}
      <Lbl>Los datos se comparten entre roles: lo que hagas como doctor se refleja en la pantalla y en la app del paciente.</Lbl>
      <Btn kind="sec" label="← Volver al login" onPress={back} />
    </ScrollView>
  );
}

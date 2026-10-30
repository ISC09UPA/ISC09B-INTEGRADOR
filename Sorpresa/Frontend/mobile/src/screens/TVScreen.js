import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
import { C, CAP, st } from '../theme';
import { Card, Row, Lbl, Pill, Btn, Tabs, Header, Field } from '../components/ui';

export default function TVScreen({ s, back }) {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <TouchableOpacity onPress={back}><Text style={{ color: C.teal, fontWeight: '600' }}>← Salir de la pantalla</Text></TouchableOpacity>
      <View style={st.tvNow}>
        <Text style={{ color: '#d9f0ec', fontSize: 16 }}>Siguiente paciente</Text>
        <Text style={st.tvTurn}>{s.called ? s.called.turn : '—'}</Text>
        <Text style={{ color: '#fff', fontSize: 26 }}>{s.called ? s.called.name : 'Sin llamado'}</Text>
        {s.called && <Text style={st.tvCons}>Pasar al Consultorio 1</Text>}
      </View>
      <Card>
        <Lbl>En espera</Lbl>
        {s.queue.slice(0, 4).map((q) => <Row key={q.turn} style={st.item}><Text style={st.num}>{q.turn.slice(2)}</Text><Text style={{ flex: 1, fontSize: 16 }}>{q.name}</Text></Row>)}
      </Card>
    </View>
  );
}

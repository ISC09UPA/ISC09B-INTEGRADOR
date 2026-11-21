import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
import { C, CAP, st } from '../theme';
import { Card, Row, Lbl, Pill, Btn, Tabs, Header, Field } from '../components/ui';

export default function DoctorScreen({ s, A, back }) {
  return (
    <View style={{ flex: 1 }}>
      <Header sub="Dra. Ana Torres · Consultorio 1" title="Fila de espera" onBack={back} />
      <ScrollView contentContainerStyle={st.body}>
        <Card style={{ borderColor: C.teal }}>
          <Row><Lbl>{s.status === 'inconsult' ? 'En consulta' : s.status === 'called' ? 'Llamado, esperando' : 'Libre'}</Lbl>
            {s.called && <Pill t={s.status === 'inconsult' ? 'En curso' : 'En pantalla'} k="ok" />}</Row>
          <Text style={st.big}>{s.called ? s.called.turn : '—'}</Text>
          <Text>{s.called ? s.called.name : 'Sin paciente'}</Text>
        </Card>
        <Card>
          <Row><Text style={{ fontWeight: '700' }}>Siguientes</Text><Pill t={s.queue.length + ' en espera'} /></Row>
          {s.queue.map((q) => <Row key={q.turn} style={st.item}><Text style={st.num}>{q.turn.slice(2)}</Text><Text style={{ flex: 1 }}>{q.name}</Text></Row>)}
          {!s.queue.length && <Lbl>Fila vacía</Lbl>}
        </Card>
        <Btn label={'Llamar siguiente' + (s.queue[0] ? ' (' + s.queue[0].turn + ')' : '')} onPress={A.call} disabled={!s.queue.length || s.status !== 'idle'} />
        <Btn kind="sec" label="Iniciar consulta" onPress={A.start} disabled={s.status !== 'called'} />
        <Btn kind="red" label="Finalizar consulta" onPress={A.end} disabled={s.status !== 'inconsult'} />
        <Lbl>Orden: finalizar → llamar siguiente → iniciar consulta. Al llamar, la pantalla de la sala se actualiza.</Lbl>
      </ScrollView>
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
import { C, CAP, st } from '../theme';
import { Card, Row, Lbl, Pill, Btn, Tabs, Header, Field } from '../components/ui';

export default function AdminScreen({ s, A, occupancy, denied, back }) {
  const [tab, setTab] = useState('Estado');
  const over = occupancy > CAP;
  return (
    <View style={{ flex: 1 }}>
      <Header sub="Administrador" title={tab} onBack={back} />
      <ScrollView contentContainerStyle={st.body}>
        {tab === 'Estado' && (<>
          {denied[0] && <View style={st.alert}><Text><Text style={{ fontWeight: '700' }}>Acceso denegado</Text> · {denied[0].who} · {denied[0].t}</Text></View>}
          {over && <View style={[st.alert, { borderColor: C.warn, backgroundColor: C.warnS }]}><Text><Text style={{ fontWeight: '700' }}>Sala llena</Text> · {occupancy} personas (capacidad {CAP})</Text></View>}
          <Row style={{ gap: 8 }}>
            <Card style={{ flex: 1 }}><Lbl>Puerta</Lbl><Pill t={s.door === 'auto' ? 'Automática' : s.door === 'open' ? 'Abierta' : 'Bloqueada'} k={s.door === 'blocked' ? 'bad' : 'ok'} /></Card>
            <Card style={{ flex: 1 }}><Lbl>Turno en pantalla</Lbl><Text style={st.big}>{s.called ? s.called.turn : '—'}</Text></Card>
          </Row>
          <Card>
            <Row><Lbl>Ocupación sala de espera</Lbl><Text style={{ fontWeight: '700' }}>{occupancy} / {CAP}</Text></Row>
            <View style={st.bar}><View style={[st.barI, { width: Math.min(100, (occupancy / CAP) * 100) + '%', backgroundColor: over ? C.warn : C.teal }]} /></View>
          </Card>
          <Card>
            <Row><Text style={{ fontWeight: '700' }}>Fila de espera</Text><Pill t={s.queue.length + ' en espera'} /></Row>
            {s.queue.map((q) => <Row key={q.turn} style={st.item}><Text style={st.num}>{q.turn.slice(2)}</Text><Text style={{ flex: 1 }}>{q.name}</Text></Row>)}
            {!s.queue.length && <Lbl>Fila vacía</Lbl>}
          </Card>
          <Row style={{ gap: 8 }}>
            <View style={{ flex: 1 }}><Btn kind="sec" label="Abrir puerta" onPress={() => A.door('open')} /></View>
            <View style={{ flex: 1 }}><Btn kind="red" label="Bloquear" onPress={() => A.door('blocked')} /></View>
          </Row>
          <Btn kind="sec" label="Volver a modo automático" onPress={() => A.door('auto')} />
          <Lbl>Simulaciones del hardware</Lbl>
          <Btn kind="sec" label="Tag desconocido en la puerta" onPress={A.unknownTag} />
          <Btn kind="sec" label="Foto de cámara: más personas" onPress={A.camera} />
        </>)}

        {tab === 'Bitácora' && (
          <Card>{s.log.map((l, i) => (
            <Row key={i} style={st.item}><Text style={{ color: C.mute }}>{l.t}</Text><Text style={{ flex: 1, marginLeft: 10 }}>{l.who}</Text><Pill t={l.ok ? 'Concedido' : 'Denegado'} k={l.ok ? 'ok' : 'bad'} /></Row>
          ))}</Card>
        )}

        {tab === 'Usuarios' && (<>
          <Card>{s.users.map((u) => (
            <Row key={u.id} style={st.item}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '600' }}>{u.name}</Text><Lbl>{u.role} · Tag {u.tag}</Lbl></View>
              <Switch value={u.on} onValueChange={() => A.toggleUser(u.id)} trackColor={{ true: C.ok }} />
            </Row>
          ))}</Card>
          <Btn label="+ Dar de alta usuario / tag" onPress={A.addUser} />
          <Lbl>Desactiva a María López y usa su pase en el rol Paciente para ver el acceso denegado.</Lbl>
        </>)}

        {tab === 'Estadísticas' && (<>
          <Card>
            <Row><Text style={{ fontWeight: '700' }}>Visitas por hora</Text><Lbl>Hoy</Lbl></Row>
            <View style={st.chart}>{[20, 45, 80, 100, 70, 55, 90, 40, 25].map((h, i) => <View key={i} style={[st.col, { height: h * 0.6 }]} />)}</View>
          </Card>
          <Row style={{ gap: 8 }}>
            <Card style={{ flex: 1 }}><Lbl>Espera promedio</Lbl><Text style={st.big}>14 min</Text></Card>
            <Card style={{ flex: 1 }}><Lbl>Accesos denegados</Lbl><Text style={st.big}>{denied.length}</Text></Card>
          </Row>
          <Card><Lbl>Ocupación actual</Lbl><Text style={st.big}>{occupancy} de {CAP}</Text></Card>
        </>)}
      </ScrollView>
      <Tabs items={['Estado', 'Bitácora', 'Usuarios', 'Estadísticas']} value={tab} onChange={setTab} />
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
import { C, CAP, st } from '../theme';
import { Card, Row, Lbl, Pill, Btn, Tabs, Header, Field } from '../components/ui';

export default function PacienteScreen({ s, A, back }) {
  const [tab, setTab] = useState('Mi turno');
  const [sel, setSel] = useState(s.appt);
  const [mode, setMode] = useState('NFC');
  const pos = s.queue.findIndex((q) => q.turn === s.me);
  const myCall = s.called && s.called.turn === s.me;
  return (
    <View style={{ flex: 1 }}>
      <Header sub="Paciente · María López" title={tab} onBack={back} />
      <ScrollView contentContainerStyle={st.body}>
        {tab === 'Mi turno' && (<>
          {myCall && s.status === 'called' && <View style={[st.alert, { borderColor: C.ok, backgroundColor: C.okS }]}><Text style={{ fontWeight: '700' }}>🔔 ¡Es tu turno! Pasa al Consultorio 1</Text></View>}
          {myCall && s.status === 'inconsult' && <Card><Text style={{ fontWeight: '700' }}>Estás en consulta</Text></Card>}
          {!s.me && <Card><Text style={{ fontWeight: '700' }}>Aún no has llegado</Text><Lbl>Usa “Mi pase” en la puerta para registrar tu llegada y recibir turno.</Lbl></Card>}
          {s.me && pos >= 0 && (<>
            <Card style={{ alignItems: 'center', padding: 20 }}>
              <Lbl>Tu turno</Lbl><Text style={[st.big, { fontSize: 52, color: C.teal }]}>{s.me}</Text>
              <Pill t={pos === 0 ? 'Eres el siguiente' : 'Tienes ' + pos + ' paciente(s) antes'} k="warn" />
            </Card>
            <Row style={{ gap: 8 }}>
              <Card style={{ flex: 1 }}><Lbl>Espera estimada</Lbl><Text style={st.big}>{(pos + 1) * 8} min</Text></Card>
              <Card style={{ flex: 1 }}><Lbl>En pantalla</Lbl><Text style={st.big}>{s.called ? s.called.turn : '—'}</Text></Card>
            </Row>
          </>)}
          <Card><Row><Lbl>Cita de hoy</Lbl><Text style={{ fontWeight: '700' }}>{s.appt} a. m.</Text></Row><Row><Lbl>Consultorio</Lbl><Text style={{ fontWeight: '700' }}>1 · Dra. Torres</Text></Row></Card>
        </>)}

        {tab === 'Agendar' && (<>
          <Card><Lbl>Doctor</Lbl><Text style={{ fontWeight: '700' }}>Dra. Ana Torres · Consultorio 1</Text></Card>
          <Card><Lbl>Horarios disponibles · Ma 27</Lbl>
            <View style={st.slots}>{['9:00', '9:30', '10:00', '10:30', '11:00', '12:00'].map((h) => (
              <TouchableOpacity key={h} onPress={() => setSel(h)} style={[st.slot, sel === h && { backgroundColor: C.teal }]}>
                <Text style={{ color: sel === h ? '#fff' : C.ink }}>{h}</Text>
              </TouchableOpacity>))}</View>
          </Card>
          <Btn label={'Confirmar cita · ' + sel} onPress={() => { A.book(sel); setTab('Mi turno'); }} />
        </>)}

        {tab === 'Mi pase' && (<>
          <Row style={{ gap: 8 }}>
            {['NFC', 'QR'].map((m) => <View key={m} style={{ flex: 1 }}><Btn kind={mode === m ? 'pri' : 'sec'} label={m === 'QR' ? 'Código QR' : 'NFC'} onPress={() => setMode(m)} /></View>)}
          </Row>
          <Card style={{ alignItems: 'center', padding: 24, gap: 8 }}>
            {mode === 'NFC'
              ? <><View style={st.ring}><Text style={{ color: '#fff', fontWeight: '700' }}>NFC</Text></View><Text style={{ fontWeight: '700' }}>Acerca tu teléfono al lector</Text></>
              : <><View style={st.qr}>{Array.from({ length: 36 }).map((_, i) => <View key={i} style={{ width: '16.66%', height: '16.66%', backgroundColor: (i * 7 + (i >> 2)) % 3 ? C.ink : '#fff' }} />)}</View><Text style={{ fontWeight: '700' }}>Muestra el código al lector</Text></>}
          </Card>
          <Btn label="Simular lectura en la puerta" onPress={A.pass} />
          {s.lastPass === 'ok' && <Card style={{ backgroundColor: C.okS, borderColor: C.okS, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: C.ok }}>✓ Acceso concedido · LED verde</Text><Text>Tu turno: {s.me} · revisa “Mi turno”</Text></Card>}
          {s.lastPass === 'denied' && <Card style={{ backgroundColor: C.badS, borderColor: C.badS, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: C.bad }}>✕ Acceso denegado · LED rojo + buzzer</Text></Card>}
        </>)}
      </ScrollView>
      <Tabs items={['Mi turno', 'Agendar', 'Mi pase']} value={tab} onChange={setTab} />
    </View>
  );
}

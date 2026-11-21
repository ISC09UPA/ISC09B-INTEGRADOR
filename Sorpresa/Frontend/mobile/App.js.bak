import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, Platform, StatusBar } from 'react-native';

const C = { ink: '#16302f', mute: '#5f7776', bg: '#f4f8f8', line: '#d5e0e0', teal: '#0f766e', soft: '#d9f0ec', ok: '#15803d', okS: '#dcf5e3', bad: '#c2321f', badS: '#fbe3df', warn: '#b45309', warnS: '#fdeccd' };
const CAP = 8;
const hhmm = () => new Date().toTimeString().slice(0, 5);

/* ---------- UI base ---------- */
const Card = ({ children, style }) => <View style={[st.card, style]}>{children}</View>;
const Row = ({ children, style }) => <View style={[st.row, style]}>{children}</View>;
const Lbl = ({ children }) => <Text style={st.lbl}>{children}</Text>;
const Pill = ({ t, k = 'soft' }) => {
  const m = { soft: [C.soft, C.teal], ok: [C.okS, C.ok], bad: [C.badS, C.bad], warn: [C.warnS, C.warn] }[k];
  return <Text style={[st.pill, { backgroundColor: m[0], color: m[1] }]}>{t}</Text>;
};
const Btn = ({ label, onPress, kind = 'pri', disabled }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8}
    style={[st.btn, kind === 'sec' && st.btnSec, kind === 'red' && { backgroundColor: C.bad }, disabled && { opacity: 0.4 }]}>
    <Text style={[st.btnT, kind === 'sec' && { color: C.teal }]}>{label}</Text>
  </TouchableOpacity>
);
const Tabs = ({ items, value, onChange }) => (
  <View style={st.tabs}>
    {items.map((t) => (
      <TouchableOpacity key={t} style={{ flex: 1 }} onPress={() => onChange(t)}>
        <Text style={[st.tab, value === t && { color: C.teal, fontWeight: '700' }]}>{t}</Text>
      </TouchableOpacity>
    ))}
  </View>
);
const Header = ({ title, sub, onBack }) => (
  <Row style={{ padding: 16, paddingBottom: 8 }}>
    <View><Lbl>{sub}</Lbl><Text style={st.h2}>{title}</Text></View>
    <TouchableOpacity onPress={onBack}><Text style={{ color: C.teal, fontWeight: '600' }}>Cambiar rol</Text></TouchableOpacity>
  </Row>
);

/* ---------- App + estado compartido ---------- */
export default function App() {
  const [role, setRole] = useState(null);
  const [s, setS] = useState({
    queue: [{ turn: 'A-015', name: 'Jorge Ramos' }, { turn: 'A-016', name: 'Elena Cruz' }, { turn: 'A-017', name: 'Pedro Sánchez' }],
    called: { turn: 'A-014', name: 'Carlos Medina' }, status: 'inconsult', next: 18,
    door: 'auto', extra: 1, me: null, appt: '9:30', lastPass: null,
    log: [{ t: '09:12', who: 'Dra. Ana Torres', ok: true }],
    users: [
      { id: 1, name: 'Dra. Ana Torres', role: 'Doctor', tag: '7C:11:90', on: true },
      { id: 2, name: 'Luis Pérez', role: 'Personal', tag: '3B:F0:22', on: true },
      { id: 3, name: 'María López', role: 'Paciente', tag: '9D:42:E7', on: true },
    ],
  });
  const up = (p) => setS((x) => ({ ...x, ...(typeof p === 'function' ? p(x) : p) }));

  const occupancy = s.queue.length + (s.status === 'called' ? 1 : 0) + s.extra;
  const denied = s.log.filter((l) => !l.ok);
  const A = {
    // paciente pasa su pase NFC/QR por el lector
    pass: () => up((x) => {
      const u = x.users.find((v) => v.id === 3);
      if (!u.on || x.door === 'blocked') return { lastPass: 'denied', log: [{ t: hhmm(), who: u.name, ok: false }, ...x.log] };
      if (x.me) return { lastPass: 'ok', log: [{ t: hhmm(), who: u.name, ok: true }, ...x.log] };
      const turn = 'A-0' + x.next;
      return { lastPass: 'ok', me: turn, next: x.next + 1, queue: [...x.queue, { turn, name: u.name }], log: [{ t: hhmm(), who: u.name, ok: true }, ...x.log] };
    }),
    unknownTag: () => up((x) => ({ log: [{ t: hhmm(), who: 'Tag 04:A2:1F', ok: false }, ...x.log] })),
    call: () => up((x) => (x.queue.length ? { called: x.queue[0], queue: x.queue.slice(1), status: 'called' } : {})),
    start: () => up({ status: 'inconsult' }),
    end: () => up({ status: 'idle', called: null }),
    toggleUser: (id) => up((x) => ({ users: x.users.map((u) => (u.id === id ? { ...u, on: !u.on } : u)) })),
    addUser: () => up((x) => ({ users: [...x.users, { id: x.users.length + 1, name: 'Nuevo usuario ' + (x.users.length + 1), role: 'Paciente', tag: '04:A2:1F', on: true }] })),
    door: (d) => up({ door: d }),
    camera: () => up((x) => ({ extra: x.extra >= 9 ? 1 : x.extra + 4 })),
    book: (t) => up({ appt: t }),
  };
  const p = { s, A, occupancy, denied, back: () => setRole(null) };

  return (
    <SafeAreaView style={st.safe}>
      {role === null && <Login setRole={setRole} />}
      {role === 'admin' && <Admin {...p} />}
      {role === 'doctor' && <Doctor {...p} />}
      {role === 'paciente' && <Paciente {...p} />}
      {role === 'tv' && <TV {...p} />}
    </SafeAreaView>
  );
}

/* ---------- Login ---------- */
function Login({ setRole }) {
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
    </ScrollView>
  );
}

/* ---------- Administrador ---------- */
function Admin({ s, A, occupancy, denied, back }) {
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

/* ---------- Doctor ---------- */
function Doctor({ s, A, back }) {
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

/* ---------- Paciente ---------- */
function Paciente({ s, A, back }) {
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

/* ---------- Pantalla de sala de espera ---------- */
function TV({ s, back }) {
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

/* ---------- Estilos ---------- */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  body: { padding: 12, gap: 10 },
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

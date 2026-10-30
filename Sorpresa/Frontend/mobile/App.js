import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { CAP, hhmm, st } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import AdminScreen from './src/screens/AdminScreen';
import DoctorScreen from './src/screens/DoctorScreen';
import PacienteScreen from './src/screens/PacienteScreen';
import TVScreen from './src/screens/TVScreen';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [notice, setNotice] = useState('');
  const [accounts, setAccounts] = useState([
    { name: 'Administrador', email: 'admin@demo.com', pass: 'admin123', role: 'admin' },
    { name: 'Dra. Ana Torres', email: 'doctor@demo.com', pass: 'doctor123', role: 'doctor' },
    { name: 'María López', email: 'paciente@demo.com', pass: 'paciente123', role: 'paciente' },
  ]);
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
  const p = { s, A, occupancy, denied, back: () => setScreen('login') };

  const goLogin = (msg = '') => { setNotice(msg); setScreen('login'); };
  return (
    <SafeAreaView style={st.safe}>
      {screen === 'login' && <LoginScreen accounts={accounts} notice={notice} onLogin={setScreen} goRegister={() => setScreen('register')} goDemo={() => setScreen('demo')} />}
      {screen === 'register' && <RegisterScreen accounts={accounts} setAccounts={setAccounts} goLogin={goLogin} />}
      {screen === 'demo' && <RoleSelectScreen setRole={setScreen} back={() => setScreen('login')} />}
      {screen === 'admin' && <AdminScreen {...p} />}
      {screen === 'doctor' && <DoctorScreen {...p} />}
      {screen === 'paciente' && <PacienteScreen {...p} />}
      {screen === 'tv' && <TVScreen {...p} />}
    </SafeAreaView>
  );
}

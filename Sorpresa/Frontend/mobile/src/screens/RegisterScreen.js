import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { C, st } from '../theme';
import { Btn, Lbl, Row, Field } from '../components/ui';

export default function RegisterScreen({ accounts, setAccounts, goLogin }) {
  const [f, setF] = useState({ name: '', email: '', pass: '', pass2: '', role: 'paciente' });
  const [err, setErr] = useState('');
  const set = (k) => (v) => { setF({ ...f, [k]: v }); setErr(''); };

  const submit = () => {
    const email = f.email.trim().toLowerCase();
    if (!f.name.trim()) return setErr('Escribe tu nombre');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Correo no válido');
    if (f.pass.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres');
    if (f.pass !== f.pass2) return setErr('Las contraseñas no coinciden');
    if (accounts.some((x) => x.email === email)) return setErr('Ese correo ya está registrado');
    setAccounts([...accounts, { name: f.name.trim(), email, pass: f.pass, role: f.role }]);
    goLogin('Cuenta creada. Inicia sesión.');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={[st.h2, { fontSize: 26, marginTop: 20 }]}>Crear cuenta</Text>
      <Lbl>Regístrate para usar el consultorio</Lbl>
      <Field label="Nombre completo" value={f.name} onChange={set('name')} />
      <Field label="Correo" value={f.email} onChange={set('email')} kb="email-address" />
      <Field label="Contraseña" value={f.pass} onChange={set('pass')} secure />
      <Field label="Confirmar contraseña" value={f.pass2} onChange={set('pass2')} secure />
      <Lbl>Tipo de cuenta</Lbl>
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}><Btn kind={f.role === 'paciente' ? 'pri' : 'sec'} label="Paciente" onPress={() => set('role')('paciente')} /></View>
        <View style={{ flex: 1 }}><Btn kind={f.role === 'doctor' ? 'pri' : 'sec'} label="Doctor / Personal" onPress={() => set('role')('doctor')} /></View>
      </Row>
      {!!err && <View style={st.alert}><Text style={{ color: C.bad }}>{err}</Text></View>}
      <Btn label="Crear cuenta" onPress={submit} />
      <Btn kind="sec" label="Ya tengo cuenta" onPress={() => goLogin('')} />
    </ScrollView>
  );
}

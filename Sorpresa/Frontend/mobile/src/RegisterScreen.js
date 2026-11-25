import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { C, st } from '../theme';
import { Btn, Lbl, Field } from '../components/ui';
import { register } from '../api';

export default function RegisterScreen({ goLogin }) {
  const [f, setF] = useState({ name: '', email: '', pass: '', pass2: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => { setF({ ...f, [k]: v }); setErr(''); };

  const submit = async () => {
    const email = f.email.trim().toLowerCase();
    if (!f.name.trim()) return setErr('Escribe tu nombre');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Correo no válido');
    if (f.pass.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres');
    if (f.pass !== f.pass2) return setErr('Las contraseñas no coinciden');
    setLoading(true);
    try {
      await register(f.name.trim(), email, f.pass);
      goLogin('Cuenta creada. Inicia sesión.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={[st.h2, { fontSize: 26, marginTop: 20 }]}>Crear cuenta</Text>
      <Lbl>Regístrate como paciente</Lbl>
      <Field label="Nombre completo" value={f.name} onChange={set('name')} />
      <Field label="Correo" value={f.email} onChange={set('email')} kb="email-address" />
      <Field label="Contraseña" value={f.pass} onChange={set('pass')} secure />
      <Field label="Confirmar contraseña" value={f.pass2} onChange={set('pass2')} secure />
      {!!err && <View style={st.alert}><Text style={{ color: C.bad }}>{err}</Text></View>}
      <Btn label={loading ? 'Creando...' : 'Crear cuenta'} onPress={submit} disabled={loading} />
      <Btn kind="sec" label="Ya tengo cuenta" onPress={() => goLogin('')} disabled={loading} />
    </ScrollView>
  );
}

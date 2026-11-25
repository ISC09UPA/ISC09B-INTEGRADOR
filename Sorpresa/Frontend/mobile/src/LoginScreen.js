import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { C, st } from '../theme';
import { Btn, Lbl, Field } from '../components/ui';
import { login } from '../api';

export default function LoginScreen({ onLogin, goRegister, goDemo, notice }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !pass) return setErr('Escribe tu correo y contraseña');
    setLoading(true);
    setErr('');
    try {
      const r = await login(email.trim(), pass); // { token, nombre, rol }
      setPass('');
      onLogin(r.rol, r);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={[st.h2, { fontSize: 26, marginTop: 20 }]}>Consultorio Inteligente</Text>
      <Lbl>Inicia sesión para continuar</Lbl>
      <Field label="Correo" value={email} onChange={(v) => { setEmail(v); setErr(''); }} kb="email-address" />
      <Field label="Contraseña" value={pass} onChange={(v) => { setPass(v); setErr(''); }} secure />
      {!!err && <View style={st.alert}><Text style={{ color: C.bad }}>{err}</Text></View>}
      {!!notice && !err && <View style={[st.alert, { borderColor: C.ok, backgroundColor: C.okS }]}><Text style={{ color: C.ok }}>{notice}</Text></View>}
      <Btn label={loading ? 'Entrando...' : 'Iniciar sesión'} onPress={submit} disabled={loading} />
      <Btn kind="sec" label="Crear una cuenta" onPress={goRegister} disabled={loading} />
      <TouchableOpacity onPress={goDemo}><Text style={{ color: C.teal, fontWeight: '600' }}>Entrar sin cuenta (modo demo)</Text></TouchableOpacity>
    </ScrollView>
  );
}

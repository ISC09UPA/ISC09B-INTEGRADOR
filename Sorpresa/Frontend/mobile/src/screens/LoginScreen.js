import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { C, st } from '../theme';
import { Btn, Lbl, Field } from '../components/ui';

export default function LoginScreen({ accounts, onLogin, goRegister, goDemo, notice }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    const a = accounts.find((x) => x.email === email.trim().toLowerCase() && x.pass === pass);
    if (!a) return setErr('Correo o contraseña incorrectos');
    setPass('');
    onLogin(a.role);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={[st.h2, { fontSize: 26, marginTop: 20 }]}>Consultorio Inteligente</Text>
      <Lbl>Inicia sesión para continuar</Lbl>
      <Field label="Correo" value={email} onChange={(v) => { setEmail(v); setErr(''); }} kb="email-address" />
      <Field label="Contraseña" value={pass} onChange={(v) => { setPass(v); setErr(''); }} secure />
      {!!err && <View style={st.alert}><Text style={{ color: C.bad }}>{err}</Text></View>}
      {!!notice && !err && <View style={[st.alert, { borderColor: C.ok, backgroundColor: C.okS }]}><Text style={{ color: C.ok }}>{notice}</Text></View>}
      <Btn label="Iniciar sesión" onPress={submit} />
      <Btn kind="sec" label="Crear una cuenta" onPress={goRegister} />
      <Lbl>Cuentas de prueba: admin@demo.com / admin123 · doctor@demo.com / doctor123 · paciente@demo.com / paciente123</Lbl>
      <TouchableOpacity onPress={goDemo}><Text style={{ color: C.teal, fontWeight: '600' }}>Entrar sin cuenta (modo demo)</Text></TouchableOpacity>
    </ScrollView>
  );
}

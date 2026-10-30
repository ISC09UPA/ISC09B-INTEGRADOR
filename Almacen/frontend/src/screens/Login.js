import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { S, Btn } from '../components';
import { login } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function entrar() {
    setBusy(true);
    setErr('');
    try {
      onLogin(await login(email.trim().toLowerCase(), pass));
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.primary }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="cube" size={46} color={C.ink} />
        </View>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 18 }}>Almacén Inteligente</Text>
        <Text style={{ color: '#BFE0E7', marginTop: 4 }}>Tu inventario, en tiempo real</Text>
      </View>
      <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 }}>
        <Text style={S.label}>Correo</Text>
        <TextInput style={S.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Text style={S.label}>Contraseña</Text>
        <TextInput style={S.input} value={pass} onChangeText={setPass} secureTextEntry onSubmitEditing={entrar} />
        {!!err && <Text style={{ color: C.red, marginTop: 10 }}>{err}</Text>}
        <Btn t={busy ? 'Entrando…' : 'Iniciar sesión'} onPress={entrar} off={busy || !email || !pass} />
        <Text style={{ color: C.sub, fontSize: 12, marginTop: 14, textAlign: 'center' }}>
          Demo: admin@almacen.com / admin123{'\n'}operador@almacen.com / op123
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

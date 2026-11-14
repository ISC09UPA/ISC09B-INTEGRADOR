import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { confirmar, avisar } from '../plataforma';
import { getUsuarios, crearUsuario, eliminarUsuario } from '../api';
import { useData, S, Card, Btn, Cargando } from '../components';

const vacio = { nombre: '', email: '', pass: '', rol: 'operador' };

export default function Usuarios({ yo }) {
  const [us, load, error] = useData(getUsuarios, 10000);
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState(vacio);
  const [err, setErr] = useState('');
  if (!us) return <Cargando texto="Cargando usuarios…" error={error} onReintentar={load} />;

  async function guardar() {
    try {
      await crearUsuario({ ...f, nombre: f.nombre.trim(), email: f.email.trim().toLowerCase() });
      setAbierto(false);
      setF(vacio);
      setErr('');
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  const baja = (u) =>
    confirmar('Dar de baja', `¿Quitar a ${u.nombre}? Ya no podrá iniciar sesión.`, 'Dar de baja', async () => {
      try {
        await eliminarUsuario(u.id);
        load();
      } catch (e) {
        avisar('No se pudo dar de baja', e.message);
      }
    });

  const ok = f.nombre.trim() && f.email.includes('@') && f.pass.length >= 6;
  const campo = (k, label, extra = {}) => (
    <View>
      <Text style={S.label}>{label}</Text>
      <TextInput style={S.input} value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} autoCapitalize="none" {...extra} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        <Text style={S.h}>Usuarios</Text>
        <Text style={S.sub}>{us.length} cuentas con acceso a la app</Text>
        {us.map((u) => (
          <Card key={u.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: u.rol === 'admin' ? C.amberSoft : C.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Text style={{ fontWeight: '800', color: u.rol === 'admin' ? '#8A5A00' : C.primary }}>{u.nombre[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: C.ink }}>{u.nombre}</Text>
              <Text style={{ color: C.sub, fontSize: 12 }}>{u.email}, {u.rol === 'admin' ? 'administrador' : 'operador'}</Text>
            </View>
            {u.email !== yo && (
              <Pressable onPress={() => baja(u)} hitSlop={10}>
                <Ionicons name="trash-outline" size={22} color={C.red} />
              </Pressable>
            )}
          </Card>
        ))}
      </ScrollView>

      <Pressable onPress={() => setAbierto(true)} style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: C.amber, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 22, elevation: 4 }}>
        <Text style={{ fontWeight: '800', color: C.ink }}>+ Nuevo usuario</Text>
      </Pressable>

      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,34,46,.45)' }}>
          <ScrollView style={{ maxHeight: '90%', backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 }} contentContainerStyle={{ padding: 22, paddingBottom: 34 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>Nuevo usuario</Text>
            {campo('nombre', 'Nombre completo', { autoCapitalize: 'words' })}
            {campo('email', 'Correo', { keyboardType: 'email-address' })}
            {campo('pass', 'Contraseña (mínimo 6 caracteres)', { secureTextEntry: true })}
            <Text style={S.label}>Rol</Text>
            <View style={{ flexDirection: 'row', backgroundColor: C.bg, borderRadius: 12, padding: 4 }}>
              {['operador', 'admin'].map((r) => (
                <Pressable key={r} onPress={() => setF({ ...f, rol: r })} style={{ flex: 1, padding: 10, borderRadius: 9, alignItems: 'center', backgroundColor: f.rol === r ? C.primary : 'transparent' }}>
                  <Text style={{ fontWeight: '700', color: f.rol === r ? '#fff' : C.sub }}>{r === 'admin' ? 'Administrador' : 'Operador'}</Text>
                </Pressable>
              ))}
            </View>
            {!!err && <Text style={{ color: C.red, marginTop: 10 }}>{err}</Text>}
            <Btn t="Dar de alta" onPress={guardar} off={!ok} />
            <Btn t="Cancelar" kind="ghost" onPress={() => { setAbierto(false); setErr(''); }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

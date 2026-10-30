import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { C } from '../theme';
import { getProductos, getMovimientos, registrarMovimiento } from '../api';
import { useData, S, Card, Btn, MovRow } from '../components';

export default function Movimientos({ usuario }) {
  const [ps, loadP] = useData(getProductos);
  const [hist, loadH] = useData(() => getMovimientos(usuario));
  const [tipo, setTipo] = useState('entrada');
  const [pid, setPid] = useState(null);
  const [cant, setCant] = useState('');
  const p = ps && ps.find((x) => x.id === pid);

  async function registrar() {
    try {
      await registrarMovimiento({ productoId: pid, tipo, cant: +cant, usuario });
      setCant('');
      loadP();
      loadH();
      Alert.alert('Listo', tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada');
    } catch (e) {
      Alert.alert('No se pudo registrar', e.message);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
      <Text style={S.h}>Registrar movimiento</Text>
      <Card style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', backgroundColor: C.bg, borderRadius: 12, padding: 4 }}>
          {['entrada', 'salida'].map((t) => (
            <Pressable key={t} onPress={() => setTipo(t)} style={{ flex: 1, padding: 10, borderRadius: 9, alignItems: 'center', backgroundColor: tipo === t ? (t === 'entrada' ? C.green : C.red) : 'transparent' }}>
              <Text style={{ fontWeight: '700', color: tipo === t ? '#fff' : C.sub }}>{t === 'entrada' ? 'Entrada' : 'Salida'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={S.label}>Producto</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(ps || []).map((x) => (
            <Pressable key={x.id} onPress={() => setPid(x.id)} style={{ backgroundColor: pid === x.id ? C.primary : C.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ color: pid === x.id ? '#fff' : C.ink, fontWeight: '600' }}>{x.nombre}</Text>
            </Pressable>
          ))}
        </View>
        {p && <Text style={{ color: C.sub }}>Anaquel {p.anaquel}, existencias: {p.stock}</Text>}

        <Text style={S.label}>Cantidad</Text>
        <TextInput style={S.input} value={cant} onChangeText={setCant} keyboardType="numeric" placeholder="0" />
        <Btn t={tipo === 'entrada' ? 'Registrar entrada' : 'Registrar salida'} onPress={registrar} off={!pid || !cant} />
      </Card>

      <Text style={S.h}>Mi historial</Text>
      <Card style={{ marginTop: 10 }}>
        {hist && hist.length ? hist.map((m) => <MovRow key={m.id} m={m} />) : <Text style={{ color: C.sub }}>Aún no registras movimientos. Los que hagas aparecerán aquí.</Text>}
      </Card>
    </ScrollView>
  );
}

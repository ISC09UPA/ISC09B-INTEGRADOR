import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { getProductos } from '../api';
import { useData, estado, S, Card, Chip, StockBar } from '../components';

export default function Alertas() {
  const [ps] = useData(getProductos);
  if (!ps) return <Text style={{ padding: 24, color: C.sub }}>Cargando alertas…</Text>;
  const lista = ps.filter((p) => estado(p) !== 'ok').sort((a, b) => a.stock / a.reorden - b.stock / b.reorden);

  if (!lista.length)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Ionicons name="checkmark-circle" size={64} color={C.green} />
        <Text style={[S.h, { marginTop: 10 }]}>Todo en orden</Text>
        <Text style={{ color: C.sub, textAlign: 'center', marginTop: 4 }}>Ningún producto está cerca de su punto de reorden.</Text>
      </View>
    );

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={S.h}>Reabastecimiento</Text>
      <Text style={S.sub}>Productos en el punto de reorden o cerca de llegar a él</Text>
      {lista.map((p) => (
        <Card key={p.id} style={{ borderLeftWidth: 5, borderLeftColor: estado(p) === 'bajo' ? C.red : C.amber }}>
          <View style={S.row}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, flex: 1 }}>{p.nombre}</Text>
            <Chip e={estado(p)} />
          </View>
          <Text style={{ color: C.sub, marginTop: 4 }}>Anaquel {p.anaquel}, quedan {p.stock} y el punto de reorden es {p.reorden}</Text>
          <StockBar p={p} />
          <Text style={{ color: C.ink, marginTop: 10, fontWeight: '600' }}>Pedir {p.max - p.stock} piezas para llenar el espacio</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { C } from '../theme';
import { getProductos, getMovimientos } from '../api';
import { useData, S, Card, MovRow } from '../components';

const fecha = (dias) =>
  new Date(Date.now() + dias * 864e5).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

export default function Estadisticas() {
  const [ps] = useData(getProductos);
  const [ms] = useData(() => getMovimientos());
  if (!ps || !ms) return <Text style={{ padding: 24, color: C.sub }}>Cargando estadísticas…</Text>;

  const rot = ps.map((p) => ({ ...p, r: p.salidas30 / Math.max(p.stock, 1) })).sort((a, b) => b.r - a.r);
  const top = rot[0] ? rot[0].r || 1 : 1;
  const pred = ps
    .map((p) => ({ ...p, dias: p.salidas30 ? Math.floor(p.stock / (p.salidas30 / 30)) : null }))
    .sort((a, b) => (a.dias ?? 1e9) - (b.dias ?? 1e9));

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
      <Text style={S.h}>Ranking por rotación</Text>
      <Text style={S.sub}>Salidas de los últimos 30 días frente a las existencias actuales</Text>
      <Card>
        {rot.map((p, i) => (
          <View key={p.id} style={{ marginBottom: i === rot.length - 1 ? 0 : 14 }}>
            <View style={S.row}>
              <Text style={{ fontWeight: '600', color: C.ink }}>{i + 1}. {p.nombre}</Text>
              <Text style={{ fontWeight: '800', color: C.primary }}>{p.r.toFixed(1)}x</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, marginTop: 6 }}>
              <View style={{ width: `${(p.r / top) * 100}%`, height: 8, borderRadius: 4, backgroundColor: C.primary }} />
            </View>
          </View>
        ))}
      </Card>

      <Text style={S.h}>Predicción de agotamiento</Text>
      <Text style={S.sub}>Calculada con el consumo promedio diario de cada producto</Text>
      <Card>
        {pred.map((p) => {
          const col = p.dias === null ? C.sub : p.dias <= 7 ? C.red : p.dias <= 14 ? '#8A5A00' : C.green;
          return (
            <View key={p.id} style={[S.row, { paddingVertical: 8 }]}>
              <Text style={{ color: C.ink, flex: 1 }}>{p.nombre}</Text>
              <Text style={{ color: col, fontWeight: '700' }}>
                {p.dias === null ? 'Sin consumo' : `${fecha(p.dias)}, en ${p.dias} días`}
              </Text>
            </View>
          );
        })}
      </Card>

      <Text style={S.h}>Historial de movimientos</Text>
      <Text style={S.sub}>Los últimos registros de todo el almacén</Text>
      <Card>{ms.slice(0, 10).map((m) => <MovRow key={m.id} m={m} />)}</Card>
    </ScrollView>
  );
}

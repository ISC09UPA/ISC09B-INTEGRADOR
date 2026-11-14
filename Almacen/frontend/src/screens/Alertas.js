import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { avisar } from '../plataforma';
import { getProductos, getPedidos, recibirPedido } from '../api';
import { useData, estado, hora, S, Card, Btn, Chip, StockBar, ModalReorden, Cargando } from '../components';

export default function Alertas({ usuario }) {
  const [ps, loadP, errP] = useData(getProductos);
  const [pe, loadE, errE] = useData(getPedidos);
  const [reo, setReo] = useState(null);
  const recargar = () => { loadP(); loadE(); };
  if (!ps || !pe) return <Cargando texto="Cargando alertas…" error={errP || errE} onReintentar={recargar} />;

  const enCamino = (id) => pe.some((x) => x.productoId === id);
  const lista = ps.filter((p) => estado(p) !== 'ok' && !enCamino(p.id)).sort((a, b) => a.stock / a.reorden - b.stock / b.reorden);

  async function recibir(x) {
    try {
      await recibirPedido(x.id, usuario);
      recargar();
    } catch (e) {
      avisar('No se pudo recibir el pedido', e.message);
    }
  }

  if (!lista.length && !pe.length)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Ionicons name="checkmark-circle" size={64} color={C.green} />
        <Text style={[S.h, { marginTop: 10 }]}>Todo en orden</Text>
        <Text style={{ color: C.sub, textAlign: 'center', marginTop: 4 }}>Ningún producto está cerca de su punto de reorden.</Text>
      </View>
    );

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
      {pe.length > 0 && (
        <>
          <Text style={S.h}>Pedidos en camino</Text>
          <Text style={S.sub}>Al recibirlos, las existencias suben solas</Text>
          {pe.map((x) => (
            <Card key={x.id} style={{ borderLeftWidth: 5, borderLeftColor: C.primary }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{x.producto}</Text>
              <Text style={{ color: C.sub, marginTop: 4 }}>{x.cant} piezas, pedido el {hora(x.t)}</Text>
              <Btn t="Recibir pedido" onPress={() => recibir(x)} />
            </Card>
          ))}
        </>
      )}

      {lista.length > 0 && (
        <>
          <Text style={S.h}>Por reordenar</Text>
          <Text style={S.sub}>Productos en el punto de reorden o cerca de llegar a él</Text>
          {lista.map((p) => (
            <Card key={p.id} style={{ borderLeftWidth: 5, borderLeftColor: estado(p) === 'bajo' ? C.red : C.amber }}>
              <View style={S.row}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, flex: 1 }}>{p.nombre}</Text>
                <Chip e={estado(p)} />
              </View>
              <Text style={{ color: C.sub, marginTop: 4 }}>Anaquel {p.anaquel}, quedan {p.stock} y el punto de reorden es {p.reorden}</Text>
              <StockBar p={p} />
              <Btn t="Reordenar" onPress={() => setReo(p)} />
            </Card>
          ))}
        </>
      )}
      {reo && <ModalReorden p={reo} onClose={() => setReo(null)} onDone={recargar} />}
    </ScrollView>
  );
}

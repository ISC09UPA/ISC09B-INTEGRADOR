import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { avisar, confirmar } from '../plataforma';
import { getProductos, getAlertas, getPedidos, recibirPedido, cancelarPedido } from '../api';
import { useData, estado, hora, S, Card, Btn, Chip, StockBar, ModalReorden, VerRuta } from '../components';

export default function Alertas({ usuario }) {
  const [ps, loadP] = useData(getProductos);
  const [al, loadA] = useData(getAlertas);
  const [pe, loadE] = useData(getPedidos);
  const [reo, setReo] = useState(null);
  if (!ps || !al || !pe) return <Text style={{ padding: 24, color: C.sub }}>Cargando alertas…</Text>;

  const enCamino = (id) => pe.some((x) => x.productoId === id);
  const nivel = (a) => { const p = ps.find((x) => x.id === a.productoId); return p ? p.stock / p.reorden : a.existencia / a.puntoReorden; };
  const activas = [...al].sort((a, b) => nivel(a) - nivel(b));
  // Aviso de la app (no es una alerta del backend): productos cerca del punto de reorden
  const cerca = ps.filter((p) => estado(p) === 'medio' && !enCamino(p.id));
  const recargar = () => { loadP(); loadA(); loadE(); };
  const prod = (a) => ps.find((p) => p.id === a.productoId) || { id: a.productoId, nombre: a.productoNombre, stock: a.existencia, reorden: a.puntoReorden, max: a.puntoReorden * 3 };

  async function recibir(x) {
    try {
      const r = await recibirPedido(x.id, usuario); // el backend registra la entrada; la app no lo hace
      recargar();
      if (r && r.alerta && r.alerta.estado === 'ATENDIDA') avisar('Pedido recibido', 'Las existencias subieron y la alerta quedó atendida.');
    } catch (e) {
      avisar('No se pudo recibir el pedido', e.message);
      recargar();
    }
  }
  const cancelar = (x) =>
    confirmar('Cancelar pedido', `¿Cancelar el pedido de ${x.cant} piezas de ${x.producto}?`, 'Sí, cancelar', async () => {
      try { await cancelarPedido(x.id); recargar(); } catch (e) { avisar('No se pudo cancelar', e.message); recargar(); }
    });

  if (!activas.length && !pe.length && !cerca.length)
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
              {x.proveedor && <Text style={{ color: C.sub, marginTop: 2 }}>Proveedor: {x.proveedor.nombre}</Text>}
              {x.correoEnviado === true && <Text style={{ color: C.green, marginTop: 2, fontWeight: '600' }}>Correo enviado al proveedor</Text>}
              {x.correoEnviado === false && <Text style={{ color: C.red, marginTop: 2, fontWeight: '600' }}>No se pudo enviar el correo, avísale al proveedor por otro medio</Text>}
              {x.proveedor && <VerRuta id={x.proveedor.id} />}
              <Btn t="Recibir pedido" onPress={() => recibir(x)} />
              <Btn t="Cancelar pedido" kind="danger" onPress={() => cancelar(x)} />
            </Card>
          ))}
        </>
      )}

      {activas.length > 0 && (
        <>
          <Text style={S.h}>Alertas activas</Text>
          <Text style={S.sub}>Productos en su punto de reorden o por debajo</Text>
          {activas.map((a) => {
            const p = prod(a);
            const pedido = a.pedidoId || enCamino(a.productoId);
            return (
              <Card key={a.id} style={{ borderLeftWidth: 5, borderLeftColor: C.red }}>
                <View style={S.row}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, flex: 1 }}>{a.productoNombre}</Text>
                  <Chip e="bajo" />
                </View>
                <Text style={{ color: C.sub, marginTop: 4 }}>Quedan {p.stock} y el punto de reorden es {p.reorden}</Text>
                <StockBar p={p} />
                {pedido ? <Text style={{ color: C.primary, marginTop: 10, fontWeight: '700' }}>Ya hay un pedido en camino</Text> : <Btn t="Reordenar" onPress={() => setReo(p)} />}
                {p.proveedorId ? <VerRuta id={p.proveedorId} /> : null}
              </Card>
            );
          })}
        </>
      )}

      {cerca.length > 0 && (
        <>
          <Text style={S.h}>Cerca del punto de reorden</Text>
          <Text style={S.sub}>Todavía no son alertas, pero conviene vigilarlos</Text>
          {cerca.map((p) => (
            <Card key={p.id} style={{ borderLeftWidth: 5, borderLeftColor: C.amber }}>
              <View style={S.row}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, flex: 1 }}>{p.nombre}</Text>
                <Chip e="medio" />
              </View>
              <Text style={{ color: C.sub, marginTop: 4 }}>Anaquel {p.anaquel}, quedan {p.stock} y el punto de reorden es {p.reorden}</Text>
              <StockBar p={p} />
              <Btn t="Reordenar" kind="ghost" onPress={() => setReo(p)} />
            </Card>
          ))}
        </>
      )}
      {reo && <ModalReorden p={reo} onClose={() => setReo(null)} onDone={recargar} />}
    </ScrollView>
  );
}

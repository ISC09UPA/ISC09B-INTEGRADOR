import React, { useState } from 'react';
import { View, Text, SectionList, Pressable, Modal, Alert, ScrollView } from 'react-native';
import { C } from '../theme';
import { getProductos, crearProducto, eliminarProducto, setReorden } from '../api';
import { useData, estado, hora, S, Card, Btn, Chip, StockBar, FormProducto } from '../components';

export default function Inventario({ rol }) {
  const [ps, load] = useData(getProductos);
  const [selId, setSelId] = useState(null);
  const [ro, setRo] = useState(0);
  const [nuevo, setNuevo] = useState(false);
  const admin = rol === 'admin';

  if (!ps) return <Text style={{ padding: 24, color: C.sub }}>Cargando inventario…</Text>;
  const p = ps.find((x) => x.id === selId);
  const bajos = ps.filter((x) => estado(x) === 'bajo').length;
  const secciones = [...new Set(ps.map((x) => x.anaquel))].sort().map((a) => ({ title: a, data: ps.filter((x) => x.anaquel === a) }));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SectionList
        sections={secciones}
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 34, fontWeight: '800', color: C.ink }}>{ps.length}</Text>
              <Text style={{ color: C.sub }}>productos en almacén</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 34, fontWeight: '800', color: bajos ? C.red : C.green }}>{bajos}</Text>
              <Text style={{ color: C.sub }}>en punto de reorden</Text>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.primary, marginTop: 14, marginBottom: 8, backgroundColor: C.bg }}>
            Anaquel {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => { setSelId(item.id); setRo(item.reorden); }}>
            <Card>
              <View style={S.row}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, flex: 1 }}>{item.nombre}</Text>
                <Chip e={estado(item)} />
              </View>
              <Text style={{ color: C.sub, marginTop: 4 }}>{item.stock} de {item.max} piezas</Text>
              <StockBar p={item} />
            </Card>
          </Pressable>
        )}
      />

      {admin && (
        <Pressable
          onPress={() => setNuevo(true)}
          style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: C.amber, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 22, elevation: 4 }}
        >
          <Text style={{ fontWeight: '800', color: C.ink }}>+ Nuevo producto</Text>
        </Pressable>
      )}

      {/* Detalle del producto */}
      <Modal visible={!!p} transparent animationType="slide" onRequestClose={() => setSelId(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,34,46,.45)' }}>
          {p && (
            <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 }}>
              <View style={S.row}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink, flex: 1 }}>{p.nombre}</Text>
                <Chip e={estado(p)} />
              </View>
              <Text style={{ color: C.sub, marginTop: 4 }}>Anaquel {p.anaquel}, {p.stock} de {p.max} piezas</Text>
              <StockBar p={p} />
              <Text style={S.label}>Último movimiento</Text>
              <Text style={{ color: C.ink }}>
                {p.ultimo ? `${p.ultimo.tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${p.ultimo.cant} piezas, ${hora(p.ultimo.t)}` : 'Sin movimientos'}
              </Text>
              <Text style={S.label}>Punto de reorden</Text>
              {admin ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable onPress={() => setRo(Math.max(1, ro - 5))} style={{ backgroundColor: C.bg, width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22, color: C.ink }}>−</Text>
                  </Pressable>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink, marginHorizontal: 22 }}>{ro}</Text>
                  <Pressable onPress={() => setRo(ro + 5)} style={{ backgroundColor: C.bg, width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22, color: C.ink }}>+</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={{ color: C.ink }}>{p.reorden} piezas</Text>
              )}
              {admin && (
                <>
                  <Btn t="Guardar punto de reorden" off={ro === p.reorden} onPress={async () => { await setReorden(p.id, ro); load(); setSelId(null); }} />
                  <Btn
                    t="Dar de baja producto"
                    kind="danger"
                    onPress={() =>
                      Alert.alert('Dar de baja', `¿Quitar ${p.nombre} del inventario?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Dar de baja', style: 'destructive', onPress: async () => { await eliminarProducto(p.id); setSelId(null); load(); } },
                      ])
                    }
                  />
                </>
              )}
              <Btn t="Cerrar" kind="ghost" onPress={() => setSelId(null)} />
            </View>
          )}
        </View>
      </Modal>

      {/* Alta de producto */}
      <Modal visible={nuevo} transparent animationType="slide" onRequestClose={() => setNuevo(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,34,46,.45)' }}>
          <ScrollView style={{ maxHeight: '90%', backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 }} contentContainerStyle={{ padding: 22, paddingBottom: 34 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>Nuevo producto</Text>
            <FormProducto
              onCancel={() => setNuevo(false)}
              onSave={async (d) => { await crearProducto(d); setNuevo(false); load(); }}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, shadow } from './theme';

// Pide los datos al abrir la pantalla y los refresca solos (tiempo real por consulta periódica)
export function useData(fn, ms = 5000) {
  const [data, setData] = useState(null);
  const ref = useRef(fn);
  ref.current = fn;
  const load = useCallback(() => ref.current().then(setData).catch(() => {}), []);
  useEffect(() => {
    load();
    const t = setInterval(load, ms);
    return () => clearInterval(t);
  }, [load, ms]);
  return [data, load];
}

export const estado = (p) => (p.stock <= p.reorden ? 'bajo' : p.stock <= p.reorden * 1.5 ? 'medio' : 'ok');
export const COL = { bajo: C.red, medio: C.amber, ok: C.green };
const SOFT = { bajo: C.redSoft, medio: C.amberSoft, ok: C.greenSoft };
const TXTC = { bajo: C.red, medio: '#8A5A00', ok: '#1F7A52' };
const TXT = { bajo: 'Reordenar', medio: 'Cerca del punto', ok: 'Suficiente' };
export const hora = (t) =>
  new Date(t).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const S = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10, ...shadow },
  h: { fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 8 },
  sub: { color: C.sub, fontSize: 13, marginTop: 2, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.sub, fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: C.bg, borderRadius: 12, padding: 13, fontSize: 16, color: C.ink },
  btn: { backgroundColor: C.primary, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 12 },
  btnT: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export const Card = ({ children, style }) => <View style={[S.card, style]}>{children}</View>;

export const Btn = ({ t, onPress, kind = 'main', off }) => (
  <Pressable
    disabled={off}
    onPress={onPress}
    style={({ pressed }) => [
      S.btn,
      kind === 'ghost' && { backgroundColor: C.primarySoft },
      kind === 'danger' && { backgroundColor: C.redSoft },
      off && { opacity: 0.4 },
      pressed && { opacity: 0.8 },
    ]}
  >
    <Text style={[S.btnT, kind === 'ghost' && { color: C.primary }, kind === 'danger' && { color: C.red }]}>{t}</Text>
  </Pressable>
);

export const Chip = ({ e }) => (
  <View style={{ backgroundColor: SOFT[e], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
    <Text style={{ color: TXTC[e], fontWeight: '700', fontSize: 12 }}>{TXT[e]}</Text>
  </View>
);

// Barra de existencias: la marca vertical es el punto de reorden
export const StockBar = ({ p }) => (
  <View style={{ height: 10, borderRadius: 5, backgroundColor: C.line, marginTop: 10 }}>
    <View style={{ width: `${Math.min(100, (p.stock / p.max) * 100)}%`, height: 10, borderRadius: 5, backgroundColor: COL[estado(p)] }} />
    <View style={{ position: 'absolute', left: `${(p.reorden / p.max) * 100}%`, top: -3, width: 2, height: 16, backgroundColor: C.ink }} />
  </View>
);

export const MovRow = ({ m }) => {
  const ent = m.tipo === 'entrada';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: ent ? C.greenSoft : C.redSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Ionicons name={ent ? 'arrow-down' : 'arrow-up'} size={18} color={ent ? C.green : C.red} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', color: C.ink }}>{m.producto}</Text>
        <Text style={{ color: C.sub, fontSize: 12 }}>{hora(m.t)}, {m.usuario}</Text>
      </View>
      <Text style={{ fontWeight: '800', color: ent ? C.green : C.red }}>{ent ? '+' : '−'}{m.cant}</Text>
    </View>
  );
};

export function FormProducto({ inicial = {}, onSave, onCancel, cta = 'Guardar producto' }) {
  const [f, setF] = useState({ nombre: '', anaquel: '', stock: '', reorden: '', max: '', ...inicial });
  const campo = (k, label, num) => (
    <View key={k}>
      <Text style={S.label}>{label}</Text>
      <TextInput
        style={S.input}
        value={String(f[k])}
        onChangeText={(v) => setF({ ...f, [k]: v })}
        keyboardType={num ? 'numeric' : 'default'}
      />
    </View>
  );
  return (
    <View>
      {campo('nombre', 'Nombre del producto')}
      {campo('anaquel', 'Anaquel (ejemplo: A1)')}
      {campo('stock', 'Existencias iniciales', 1)}
      {campo('reorden', 'Punto de reorden', 1)}
      {campo('max', 'Capacidad del espacio', 1)}
      <Btn
        t={cta}
        off={!(f.nombre && f.anaquel && f.max && f.reorden)}
        onPress={() => onSave({ nombre: f.nombre.trim(), anaquel: f.anaquel.trim().toUpperCase(), stock: +f.stock || 0, reorden: +f.reorden, max: +f.max })}
      />
      {onCancel && <Btn t="Cancelar" kind="ghost" onPress={onCancel} />}
    </View>
  );
}

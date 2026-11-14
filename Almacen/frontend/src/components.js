import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Animated, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, shadow } from './theme';
import { crearPedido } from './api';
import { avisar } from './plataforma';

// Pide los datos al abrir la pantalla y los refresca solos (tiempo real por consulta periódica).
// Devuelve [datos, recargar, error]: si la petición falla, "error" trae el mensaje para mostrarlo con <Cargando />.
export function useData(fn, ms = 5000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const ref = useRef(fn);
  ref.current = fn;
  const load = useCallback(
    () => ref.current().then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message || 'Error desconocido')),
    []
  );
  useEffect(() => {
    load();
    const t = setInterval(load, ms);
    return () => clearInterval(t);
  }, [load, ms]);
  return [data, load, error];
}

// Pantalla de carga; si hubo un error de red o del servidor, lo muestra con un botón para reintentar
export function Cargando({ texto, error, onReintentar }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      {error ? (
        <>
          <Ionicons name="cloud-offline-outline" size={52} color={C.sub} />
          <Text style={[S.h, { marginTop: 10 }]}>No se pudo cargar</Text>
          <Text style={{ color: C.sub, textAlign: 'center', marginTop: 4 }}>{error}</Text>
          <View style={{ alignSelf: 'stretch' }}>
            <Btn t="Reintentar" kind="ghost" onPress={onReintentar} />
          </View>
        </>
      ) : (
        <>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ color: C.sub, marginTop: 10 }}>{texto}</Text>
        </>
      )}
    </View>
  );
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

// Barra de existencias: se anima al subir o bajar el stock. La marca vertical es el punto de reorden
export function StockBar({ p }) {
  const w = useRef(new Animated.Value(0)).current;
  const t = useRef(new Animated.Value((p.reorden / p.max) * 100)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.min(100, (p.stock / p.max) * 100), duration: 700, useNativeDriver: false }).start();
  }, [p.stock, p.max]);
  useEffect(() => {
    Animated.timing(t, { toValue: Math.min(100, (p.reorden / p.max) * 100), duration: 400, useNativeDriver: false }).start();
  }, [p.reorden, p.max]);
  const pct = (v) => v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: C.line, marginTop: 10 }}>
      <Animated.View style={{ width: pct(w), height: 10, borderRadius: 5, backgroundColor: COL[estado(p)] }} />
      <Animated.View style={{ position: 'absolute', left: pct(t), top: -3, width: 2, height: 16, backgroundColor: C.ink }} />
    </View>
  );
}

export function ModalReorden({ p, onClose, onDone }) {
  const [cant, setCant] = useState(String(Math.max(p.max - p.stock, 1)));
  const [busy, setBusy] = useState(false);
  async function pedir() {
    setBusy(true);
    try {
      await crearPedido(p.id, +cant);
      onDone();
      onClose();
    } catch (e) {
      avisar('No se pudo reordenar', e.message);
      setBusy(false);
    }
  }
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,34,46,.45)' }}>
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>Reordenar {p.nombre}</Text>
          <Text style={{ color: C.sub, marginTop: 4 }}>Existencias: {p.stock} de {p.max}. Para llenar el espacio faltan {p.max - p.stock}.</Text>
          <Text style={S.label}>Piezas a pedir</Text>
          <TextInput style={S.input} value={cant} onChangeText={setCant} keyboardType="numeric" />
          <Btn t={busy ? 'Enviando…' : 'Hacer pedido'} onPress={pedir} off={busy || !(+cant > 0)} />
          <Btn t="Cancelar" kind="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

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
  const [busy, setBusy] = useState(false);
  const [errSrv, setErrSrv] = useState('');
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

  // Validación de los números: el punto de reorden y las existencias no pueden superar la capacidad
  const stock = +f.stock || 0, reorden = +f.reorden, max = +f.max;
  const errNum =
    stock < 0 || reorden < 0 || max < 0 ? 'Los números no pueden ser negativos'
    : f.max !== '' && max <= 0 ? 'La capacidad debe ser mayor a 0'
    : reorden > max && f.max !== '' ? 'El punto de reorden no puede ser mayor a la capacidad'
    : stock > max && f.max !== '' ? 'Las existencias no pueden superar la capacidad'
    : '';
  const completo = !!(f.nombre.trim() && f.anaquel.trim() && f.max && f.reorden);

  async function guardar() {
    setBusy(true);
    setErrSrv('');
    try {
      await onSave({ nombre: f.nombre.trim(), anaquel: f.anaquel.trim().toUpperCase(), stock, reorden, max });
    } catch (e) {
      setErrSrv(e.message);
    }
    setBusy(false);
  }

  return (
    <View>
      {campo('nombre', 'Nombre del producto')}
      {campo('anaquel', 'Anaquel (ejemplo: A1)')}
      {campo('stock', 'Existencias iniciales', 1)}
      {campo('reorden', 'Punto de reorden', 1)}
      {campo('max', 'Capacidad del espacio', 1)}
      {!!(errNum || errSrv) && <Text style={{ color: C.red, marginTop: 10 }}>{errNum || errSrv}</Text>}
      <Btn t={busy ? 'Guardando…' : cta} off={busy || !completo || !!errNum} onPress={guardar} />
      {onCancel && <Btn t="Cancelar" kind="ghost" onPress={onCancel} />}
    </View>
  );
}

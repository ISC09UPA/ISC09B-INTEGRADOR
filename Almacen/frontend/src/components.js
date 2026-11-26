import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Animated, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, shadow } from './theme';
import { crearPedido, getEspacios, asignarEspacio, getRuta, hayRutas } from './api';
import { avisar } from './plataforma';

// Pide los datos al abrir la pantalla y los refresca solos (tiempo real por consulta periódica)
export function useData(fn, ms = 15000) {
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

// 'sin' = producto sin espacio asignado: no es alerta ni aviso de reorden
export const estado = (p) => (p.anaquel === 'Sin espacio' ? 'sin' : p.stock <= p.reorden ? 'bajo' : p.stock <= p.reorden * 1.5 ? 'medio' : 'ok');
export const COL = { bajo: C.red, medio: C.amber, ok: C.green, sin: C.sub };
const SOFT = { bajo: C.redSoft, medio: C.amberSoft, ok: C.greenSoft, sin: C.line };
const TXTC = { bajo: C.red, medio: '#8A5A00', ok: '#1F7A52', sin: C.sub };
const TXT = { bajo: 'Reordenar', medio: 'Cerca del punto', ok: 'Suficiente', sin: 'Sin espacio' };
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
      const r = await crearPedido(p.id, +cant, p.nombre);
      onDone();
      onClose();
      const prov = r.proveedor ? r.proveedor.nombre : 'el proveedor';
      avisar(
        'Pedido de ' + r.cant + ' piezas',
        r.correoEnviado === true ? 'Se envió el correo a ' + prov + '.'
          : r.correoEnviado === false ? 'El pedido se creó, pero no se pudo enviar el correo. Avísale a ' + prov + ' por otro medio.'
          : 'El pedido quedó registrado.'
      );
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

// simple = solo nombre, punto de reorden y peso (alta desde foto del operador)
export function FormProducto({ inicial = {}, onSave, onCancel, simple, cta = 'Guardar producto' }) {
  const [f, setF] = useState({ nombre: '', anaquel: '', stock: '', reorden: '', max: '', peso: '', ...inicial });
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
      {!simple && campo('anaquel', 'Anaquel (ejemplo: A1)')}
      {!simple && campo('stock', 'Existencias iniciales', 1)}
      {campo('reorden', 'Punto de reorden', 1)}
      {!simple && campo('max', 'Capacidad del espacio', 1)}
      {campo('peso', 'Peso de una pieza (gramos)', 1)}
      <Btn
        t={cta}
        off={!(f.nombre && f.reorden && f.peso && (simple || (f.anaquel && f.max)))}
        onPress={() => onSave({ nombre: f.nombre.trim(), anaquel: f.anaquel.trim().toUpperCase(), stock: +f.stock || 0, reorden: +f.reorden, max: +f.max, peso: +f.peso })}
      />
      {onCancel && <Btn t="Cancelar" kind="ghost" onPress={onCancel} />}
    </View>
  );
}

const hoja = { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 };
const fondo = { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,34,46,.45)' };

// Asignar un espacio libre de la maqueta a un producto que no tiene (por ejemplo, el que creó el operador desde la foto)
export function ModalEspacio({ p, onClose, onDone }) {
  const [libres, setLibres] = useState(null);
  const [sel, setSel] = useState(null);
  const [cap, setCap] = useState('');
  const [ini, setIni] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getEspacios()
      .then((es) => setLibres(es.filter((e) => !e.productoId)))
      .catch((e) => { avisar('No se pudieron cargar los espacios', e.message); setLibres([]); });
  }, []);
  async function asignar() {
    setBusy(true);
    try {
      await asignarEspacio(sel, p.id, +cap, +ini || 0);
      onDone();
      onClose();
    } catch (e) {
      avisar('No se pudo asignar el espacio', e.message);
      setBusy(false);
    }
  }
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={fondo}>
        <View style={hoja}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>Asignar espacio a {p.nombre}</Text>
          <Text style={S.label}>Espacios libres</Text>
          {libres === null ? (
            <Text style={{ color: C.sub }}>Cargando espacios…</Text>
          ) : libres.length === 0 ? (
            <Text style={{ color: C.sub }}>No hay espacio libre: da de baja un producto o libera un espacio.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {libres.map((e) => (
                <Pressable key={e.id} onPress={() => setSel(e.id)} style={{ backgroundColor: sel === e.id ? C.primary : C.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 }}>
                  <Text style={{ color: sel === e.id ? '#fff' : C.ink, fontWeight: '600' }}>{e.id}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={S.label}>Capacidad del espacio (piezas)</Text>
          <TextInput style={S.input} value={cap} onChangeText={setCap} keyboardType="numeric" />
          <Text style={S.label}>Existencias iniciales (opcional)</Text>
          <TextInput style={S.input} value={ini} onChangeText={setIni} keyboardType="numeric" />
          <Btn t={busy ? 'Asignando…' : 'Asignar espacio'} onPress={asignar} off={busy || !sel || !(+cap > 0)} />
          <Btn t="Cancelar" kind="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

// Botón "Ver ruta": distancia, tiempo y mapa del proveedor al almacén (el mapa lo genera el backend)
export function VerRuta({ id }) {
  const [abierto, setAbierto] = useState(false);
  const [r, setR] = useState(null);
  if (!hayRutas) return null;
  async function abrir() {
    setAbierto(true);
    setR(null);
    try {
      setR(await getRuta(id));
    } catch (e) {
      setAbierto(false);
      avisar('No se pudo obtener la ruta', e.message);
    }
  }
  return (
    <>
      <Btn t="Ver ruta" kind="ghost" onPress={abrir} />
      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <View style={fondo}>
          <View style={hoja}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>Ruta del proveedor</Text>
            {!r ? (
              <Text style={{ color: C.sub, marginTop: 12 }}>Calculando ruta…</Text>
            ) : (
              <>
                {r.mapaPngBase64 ? (
                  <Image source={{ uri: 'data:image/png;base64,' + r.mapaPngBase64 }} resizeMode="contain" style={{ width: '100%', aspectRatio: 1.6, borderRadius: 14, marginTop: 12, backgroundColor: C.bg }} />
                ) : (
                  <Text style={{ color: C.sub, marginTop: 12 }}>No hay imagen del mapa.</Text>
                )}
                <Text style={{ color: C.ink, marginTop: 12, fontWeight: '700' }}>Distancia: {Number(r.distanciaKm).toFixed(1)} km</Text>
                <Text style={{ color: C.ink, marginTop: 2, fontWeight: '700' }}>Tiempo estimado: {r.minutosEstimados} minutos</Text>
              </>
            )}
            <Btn t="Cerrar" kind="ghost" onPress={() => setAbierto(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

import React, { useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { C } from '../theme';
import { avisar } from '../plataforma';
import { identificarProducto, crearDesdeFoto } from '../api';
import { estado, hora, S, Card, Btn, Chip, StockBar, FormProducto, ModalEspacio } from '../components';

export default function Escanear({ rol }) {
  const [img, setImg] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState(false);
  const [espacio, setEspacio] = useState(null); // producto recién registrado al que el administrador le asigna espacio

  async function tomar() {
    const web = Platform.OS === 'web';
    if (!web) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return avisar('Permiso de cámara', 'Activa el permiso de cámara para identificar productos.');
    }
    const r = web ? await ImagePicker.launchImageLibraryAsync({ quality: 0.5 }) : await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (r.canceled) return;
    // La API rechaza (400) las fotos de más de 4 MB: se avisa antes de enviarla
    const peso = r.assets[0].fileSize;
    if (peso && peso > 4 * 1024 * 1024) return avisar('La foto pesa demasiado', 'Pesa ' + (peso / 1048576).toFixed(1) + ' MB y el límite es 4 MB. Tómala de nuevo, más cerca del producto.');
    setImg(r.assets[0].uri);
    setRes(null);
    setReg(false);
    setBusy(true);
    try {
      setRes(await identificarProducto(r.assets[0].uri));
    } catch (e) {
      avisar('No se pudo identificar', e.message);
    }
    setBusy(false);
  }

  const p = res && res.encontrado && res.producto;
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
      <Text style={S.h}>Identificar producto</Text>
      <Text style={S.sub}>Toma una foto y el servidor te dirá qué producto es, o te dejará registrarlo si es nuevo.</Text>
      {img && <Image source={{ uri: img }} style={{ height: 220, borderRadius: 18, marginBottom: 10 }} />}
      <Btn t={img ? 'Tomar otra foto' : 'Tomar foto del producto'} onPress={tomar} off={busy} />
      {busy && (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ color: C.sub, marginTop: 8 }}>Analizando la foto…</Text>
        </View>
      )}

      {p && (
        <Card style={{ marginTop: 16 }}>
          <View style={S.row}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink, flex: 1 }}>{p.nombre}</Text>
            <Chip e={estado(p)} />
          </View>
          <Text style={S.label}>Existencias</Text>
          <Text style={{ color: C.ink }}>{p.stock} de {p.max} piezas</Text>
          <StockBar p={p} />
          <Text style={S.label}>Ubicación</Text>
          <Text style={{ color: C.ink }}>Anaquel {p.anaquel}</Text>
          <Text style={S.label}>Último movimiento</Text>
          <Text style={{ color: C.ink }}>
            {p.ultimo ? `${p.ultimo.tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${p.ultimo.cant} piezas, ${hora(p.ultimo.t)}` : 'Sin movimientos'}
          </Text>
        </Card>
      )}

      {res && !res.encontrado && (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>Este producto no está en el inventario</Text>
          {!!res.etiqueta && <Text style={{ color: C.ink, marginTop: 6, fontWeight: '600' }}>Vision lo detectó como: {res.etiqueta}</Text>}
          <Text style={{ color: C.sub, marginTop: 4 }}>{rol === 'admin' ? 'Escribe su nombre y su peso. Después elegirás su espacio en el anaquel.' : 'Escribe su nombre y su peso. Un administrador le asignará su espacio después.'}</Text>
          {reg ? (
            <FormProducto
              cta="Registrar producto"
              simple
              onCancel={() => setReg(false)}
              onSave={async (d) => {
                try {
                  // Operador y administrador registran con desde-foto, para que la siguiente foto ya lo reconozca
                  const nuevo = await crearDesdeFoto({ ...d, imagenUrl: res.imagenUrl });
                  setRes(null);
                  setImg(null);
                  setReg(false);
                  if (rol === 'admin') setEspacio(nuevo);
                  else avisar('Listo', 'Producto registrado. Un administrador debe asignarle un espacio.');
                } catch (e) {
                  avisar('No se pudo registrar', e.message);
                }
              }}
            />
          ) : (
            <Btn t="Registrar como nuevo producto" onPress={() => setReg(true)} />
          )}
        </Card>
      )}
      {espacio && (
        <ModalEspacio p={espacio} onClose={() => setEspacio(null)} onDone={() => avisar('Listo', 'Producto registrado y con espacio asignado.')} />
      )}
    </ScrollView>
  );
}

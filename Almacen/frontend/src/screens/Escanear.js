import React, { useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { C } from '../theme';
import { identificarProducto, crearProducto } from '../api';
import { estado, hora, S, Card, Btn, Chip, StockBar, FormProducto } from '../components';

export default function Escanear() {
  const [img, setImg] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState(false);

  async function tomar() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permiso de cámara', 'Activa el permiso de cámara para identificar productos.');
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (r.canceled) return;
    setImg(r.assets[0].uri);
    setRes(null);
    setReg(false);
    setBusy(true);
    try {
      setRes(await identificarProducto(r.assets[0].uri));
    } catch (e) {
      Alert.alert('No se pudo identificar', e.message);
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
          <Text style={{ color: C.sub, marginTop: 4 }}>Puedes registrarlo ahora con los datos de su espacio en el anaquel.</Text>
          {reg ? (
            <FormProducto
              cta="Registrar producto"
              inicial={{ nombre: res.etiqueta || '' }}
              onCancel={() => setReg(false)}
              onSave={async (d) => {
                await crearProducto(d);
                setRes(null);
                setImg(null);
                setReg(false);
                Alert.alert('Listo', 'Producto registrado en el inventario');
              }}
            />
          ) : (
            <Btn t="Registrar como nuevo producto" onPress={() => setReg(true)} />
          )}
        </Card>
      )}
    </ScrollView>
  );
}

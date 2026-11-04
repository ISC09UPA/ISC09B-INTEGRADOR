import { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import { getCruce } from '../services/cruceService';
import { colores } from '../constants/theme';

// TODO: reemplazar por el stream real de la cámara de la Raspberry Pi
const FOTO_CRUCE =
  'https://images.unsplash.com/photo-1472146936668-d987bf0a6e38?auto=format&fit=crop&w=900&q=80';

const COLOR_NIVEL = { Alta: 'red', Media: 'yellow', Baja: 'green' };
const COLOR_BARRA = { Alta: colores.rojo, Media: colores.amarillo, Baja: colores.verde };

export default function CamaraScreen() {
  const [carriles, setCarriles] = useState([]);
  const [error, setError] = useState('');

  async function cargarDensidad() {
    try {
      const datos = await getCruce();
      setCarriles(datos.carriles);
      setError('');
    } catch (err) {
      setError('No se pudo cargar la densidad de tráfico');
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargarDensidad();
    }, [])
  );

  return (
    <Pantalla error={error} onRefrescar={cargarDensidad}>
      <Encabezado titulo="Cámara en vivo" subtitulo="Cruce principal" />

      <View style={styles.video}>
        <Image source={{ uri: FOTO_CRUCE }} style={styles.imagen} />
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTexto}>EN VIVO</Text>
        </View>
        <View style={styles.etiquetaCamara}>
          <Ionicons name="camera-outline" size={16} color={colores.texto} />
          <Text style={styles.etiquetaTexto}>Cámara 01 · Vista norte</Text>
        </View>
      </View>

      <View style={styles.tituloSeccion}>
        <View>
          <Text style={styles.h2}>Densidad por carril</Text>
          <Text style={styles.sub}>Análisis mediante visión artificial</Text>
        </View>
        <Etiqueta texto="IA activa" tono="green" />
      </View>

      <Tarjeta>
        {carriles.map((c) => (
          <View key={c.nombre} style={styles.fila}>
            <View style={styles.filaTop}>
              <Text style={styles.carrilNombre}>{c.nombre}</Text>
              <Text style={styles.carrilPorcentaje}>{c.densidad}%</Text>
              <Etiqueta texto={c.nivelDensidad} tono={COLOR_NIVEL[c.nivelDensidad]} />
            </View>
            <View style={styles.progreso}>
              <View
                style={[
                  styles.progresoRelleno,
                  { width: `${c.densidad}%`, backgroundColor: COLOR_BARRA[c.nivelDensidad] },
                ]}
              />
            </View>
          </View>
        ))}
      </Tarjeta>

      <Text style={styles.credito}>Imagen: Peter Nguyen / Unsplash</Text>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  video: { height: 210, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', marginBottom: 18 },
  imagen: { width: '100%', height: '100%' },
  live: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colores.rojo },
  liveTexto: { color: colores.texto, fontSize: 11, fontWeight: '700' },
  etiquetaCamara: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  etiquetaTexto: { color: colores.texto, fontSize: 12 },
  tituloSeccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  h2: { fontSize: 17, fontWeight: '700', color: colores.texto },
  sub: { fontSize: 12, color: colores.gris, marginTop: 2 },
  fila: { marginBottom: 14 },
  filaTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  carrilNombre: { flex: 1, color: colores.texto, fontWeight: '700', fontSize: 14 },
  carrilPorcentaje: { color: colores.gris, fontSize: 13 },
  progreso: { height: 8, borderRadius: 4, backgroundColor: colores.tarjeta2, overflow: 'hidden' },
  progresoRelleno: { height: '100%', borderRadius: 4 },
  credito: { textAlign: 'center', color: colores.gris, fontSize: 10, marginTop: 4 },
});

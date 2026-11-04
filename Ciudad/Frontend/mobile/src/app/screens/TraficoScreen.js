import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Crucero from '../components/Crucero';
import { useAuth } from '../context/AuthContext';
import { getTrafico } from '../services/cruceService';
import { colores, colorSemaforo, colorChip } from '../constants/theme';

export default function TraficoScreen() {
  const { usuario } = useAuth();
  const [trafico, setTrafico] = useState(null);
  const [error, setError] = useState('');
  const [refrescando, setRefrescando] = useState(false);

  async function cargarTrafico() {
    try {
      const datos = await getTrafico();
      setTrafico(datos);
      setError('');
    } catch (err) {
      setError('No se pudo cargar el estado del tráfico');
    }
  }

  async function refrescar() {
    setRefrescando(true);
    await cargarTrafico();
    setRefrescando(false);
  }

  // Se actualiza al entrar y cada 5 segundos
  useFocusEffect(
    useCallback(() => {
      cargarTrafico();
      const id = setInterval(cargarTrafico, 5000);
      return () => clearInterval(id);
    }, [])
  );

  return (
    <Pantalla error={error} onRefrescar={refrescar} refrescando={refrescando}>
      <Encabezado titulo="Tráfico en tiempo real" subtitulo={`Hola, ${usuario.nombre.split(' ')[0]}`} />

      {trafico && (
        <>
          <Tarjeta style={styles.resumen}>
            <View style={styles.resumenIzq}>
              <View style={[styles.orbe, { backgroundColor: colorSemaforo[trafico.color] }]} />
              <View>
                <Text style={styles.sub}>Estado actual</Text>
                <Text style={styles.h2}>{trafico.estado}</Text>
              </View>
            </View>
            <Text style={styles.hora}>{trafico.hora}</Text>
          </Tarjeta>

          <Tarjeta style={{ padding: 8 }}>
            <Crucero carriles={trafico.carriles} modo="ciudadano" />
            <View style={styles.leyenda}>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaPunto, { backgroundColor: colores.verde }]} />
                <Text style={styles.leyendaTexto}>Fluido</Text>
              </View>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaPunto, { backgroundColor: colores.amarillo }]} />
                <Text style={styles.leyendaTexto}>Moderado</Text>
              </View>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaPunto, { backgroundColor: colores.rojo }]} />
                <Text style={styles.leyendaTexto}>Alto</Text>
              </View>
            </View>
          </Tarjeta>

          <View style={styles.tituloSeccion}>
            <Text style={styles.h2}>Calles cercanas</Text>
            <Text style={styles.sub}>Tiempo estimado para cruzar</Text>
          </View>

          <Tarjeta style={{ paddingVertical: 4 }}>
            {trafico.calles.map((c, i) => (
              <View key={c.nombre} style={[styles.calle, i < trafico.calles.length - 1 && styles.calleLinea]}>
                <View style={[styles.iconoCalle, { backgroundColor: colorChip[c.color].fondo }]}>
                  <Ionicons name="chevron-forward" size={18} color={colorChip[c.color].texto} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.calleNombre}>{c.nombre}</Text>
                  <Text style={styles.sub}>{c.estado}</Text>
                </View>
                <Text style={styles.tiempo}>{c.tiempo}</Text>
              </View>
            ))}
          </Tarjeta>
        </>
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  resumen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resumenIzq: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orbe: { width: 16, height: 16, borderRadius: 8 },
  sub: { fontSize: 12, color: colores.gris },
  h2: { fontSize: 17, fontWeight: '700', color: colores.texto },
  hora: { color: colores.gris, fontSize: 13 },
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: 10 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaPunto: { width: 9, height: 9, borderRadius: 5 },
  leyendaTexto: { color: colores.gris, fontSize: 12 },
  tituloSeccion: { marginBottom: 12, marginTop: 6 },
  calle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  calleLinea: { borderBottomWidth: 1, borderBottomColor: colores.linea },
  iconoCalle: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  calleNombre: { color: colores.texto, fontWeight: '700', fontSize: 14 },
  tiempo: { color: colores.texto, fontWeight: '700', fontSize: 15 },
});

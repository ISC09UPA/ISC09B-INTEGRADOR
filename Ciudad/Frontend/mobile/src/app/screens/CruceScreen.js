import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import Crucero from '../components/Crucero';
import { getCruce } from '../services/cruceService';
import { colores, colorSemaforo } from '../constants/theme';

export default function CruceScreen({ navigation }) {
  const [cruce, setCruce] = useState(null);
  const [error, setError] = useState('');
  const [refrescando, setRefrescando] = useState(false);

  async function cargarCruce() {
    try {
      const datos = await getCruce();
      setCruce(datos);
      setError('');
    } catch (err) {
      setError('No se pudo cargar el estado del cruce');
    }
  }

  async function refrescar() {
    setRefrescando(true);
    await cargarCruce();
    setRefrescando(false);
  }

  // Carga al entrar a la pantalla y se actualiza cada 5 segundos mientras esté abierta
  useFocusEffect(
    useCallback(() => {
      cargarCruce();
      const id = setInterval(cargarCruce, 5000);
      return () => clearInterval(id);
    }, [])
  );

  return (
    <Pantalla error={error} onRefrescar={refrescar} refrescando={refrescando}>
      <Encabezado
        titulo="Estado del cruce"
        subtitulo={cruce ? cruce.nombre : 'Av. Central × Calle Reforma'}
        onAlertas={() => navigation.navigate('Alertas')}
      />

      {cruce && (
        <>
          <View style={styles.filaEstado}>
            <Etiqueta texto={cruce.adaptativo ? '● Modo adaptativo' : '● Modo fijo'} tono={cruce.adaptativo ? 'blue' : 'slate'} />
            <Text style={styles.actualizado}>Actualizado ahora</Text>
          </View>

          <Tarjeta style={{ padding: 8 }}>
            <Crucero carriles={cruce.carriles} modo="admin" />
          </Tarjeta>

          <View style={styles.banner}>
            <Ionicons name="warning-outline" size={20} color={colores.amarillo} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitulo}>{cruce.alertaTitulo}</Text>
              <Text style={styles.bannerDetalle}>{cruce.alertaDetalle}</Text>
            </View>
          </View>

          <View style={styles.tituloSeccion}>
            <View>
              <Text style={styles.h2}>Flujo por carril</Text>
              <Text style={styles.sub}>Vehículos detectados ahora</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Control')}>
              <Text style={styles.link}>Controlar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {cruce.carriles.map((c) => (
              <View key={c.nombre} style={styles.carril}>
                <View style={styles.carrilCabecera}>
                  <View style={[styles.punto, { backgroundColor: colorSemaforo[c.semaforo] }]} />
                  <Text style={styles.carrilNombre}>{c.nombre}</Text>
                </View>
                <Text style={styles.carrilNumero}>
                  {c.vehiculos} <Text style={styles.carrilUnidad}>veh.</Text>
                </Text>
                <Text style={styles.carrilEspera}>{c.espera} espera</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  filaEstado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  actualizado: { fontSize: 11, color: colores.gris },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#473d13',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  bannerTitulo: { color: '#fde047', fontWeight: '700', fontSize: 14 },
  bannerDetalle: { color: '#fde68a', fontSize: 12, marginTop: 2 },
  tituloSeccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  h2: { fontSize: 17, fontWeight: '700', color: colores.texto },
  sub: { fontSize: 12, color: colores.gris, marginTop: 2 },
  link: { color: colores.azulClaro, fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  carril: {
    width: '47.5%',
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: '#26354b',
    borderRadius: 16,
    padding: 14,
  },
  carrilCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  carrilNombre: { color: colores.texto, fontWeight: '700', fontSize: 14 },
  carrilNumero: { color: colores.texto, fontSize: 26, fontWeight: '700' },
  carrilUnidad: { fontSize: 12, color: colores.gris, fontWeight: '400' },
  carrilEspera: { color: colores.gris, fontSize: 12, marginTop: 4 },
});

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import { getAlertas } from '../services/alertasService';
import { colores, colorSemaforo, colorChip } from '../constants/theme';

// tipo de alerta que manda la API -> icono
const ICONO = {
  congestion: 'warning-outline',
  incidente: 'document-text-outline',
  camara: 'camera-outline',
  normal: 'checkmark-circle-outline',
};

export default function AlertasScreen({ navigation }) {
  const [alertas, setAlertas] = useState([]);
  const [error, setError] = useState('');

  async function cargarAlertas() {
    try {
      const datos = await getAlertas();
      setAlertas(datos);
      setError('');
    } catch (err) {
      setError('No se pudieron cargar las alertas');
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargarAlertas();
    }, [])
  );

  return (
    <Pantalla error={error} onRefrescar={cargarAlertas}>
      <Encabezado titulo="Alertas" subtitulo="Centro de notificaciones" onAtras={() => navigation.goBack()} />

      <View style={styles.filtros}>
        <Etiqueta texto={`Todos · ${alertas.length}`} tono="blue" />
        <Etiqueta texto="Congestión" tono="slate" />
        <Etiqueta texto="Incidentes" tono="slate" />
      </View>

      {alertas.length === 0 && <Text style={styles.vacio}>No hay alertas</Text>}

      {alertas.map((a) => (
        <Tarjeta key={a.id} style={styles.alerta}>
          <View style={[styles.icono, { backgroundColor: colorChip[a.severidad].fondo }]}>
            <Ionicons name={ICONO[a.tipo] || 'alert-circle-outline'} size={20} color={colorChip[a.severidad].texto} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>{a.titulo}</Text>
            <Text style={styles.detalle}>{a.detalle}</Text>
            <Text style={styles.hora}>{a.hora} · Hoy</Text>
          </View>
          <View style={[styles.severidad, { backgroundColor: colorSemaforo[a.severidad] }]} />
        </Tarjeta>
      ))}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  filtros: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  vacio: { textAlign: 'center', color: colores.gris, marginVertical: 20 },
  alerta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: colores.texto, fontWeight: '700', fontSize: 14 },
  detalle: { color: colores.gris, fontSize: 12, marginTop: 2 },
  hora: { color: colores.gris, fontSize: 11, marginTop: 4 },
  severidad: { width: 8, height: 8, borderRadius: 4 },
});

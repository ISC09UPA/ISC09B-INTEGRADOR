import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import { getReportes, atenderReporte } from '../services/reportesService';
import { colores } from '../constants/theme';

export default function ReportesScreen() {
  const [reportes, setReportes] = useState([]);
  const [error, setError] = useState('');

  async function cargarReportes() {
    try {
      const datos = await getReportes();
      setReportes(datos);
      setError('');
    } catch (err) {
      setError('No se pudieron cargar los reportes');
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargarReportes();
    }, [])
  );

  async function marcarAtendido(id) {
    try {
      await atenderReporte(id);
      await cargarReportes();
    } catch (err) {
      setError('No se pudo actualizar el reporte');
    }
  }

  return (
    <Pantalla error={error} onRefrescar={cargarReportes}>
      <Encabezado titulo="Reportes ciudadanos" subtitulo={`${reportes.length} incidentes hoy`} />

      {reportes.length === 0 && <Text style={styles.vacio}>No hay reportes</Text>}

      {reportes.map((r) => (
        <Tarjeta key={r.id} style={styles.reporte}>
          <View style={styles.miniatura}>
            <Ionicons name="camera-outline" size={24} color={colores.gris} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.cabecera}>
              <Etiqueta texto={r.atendido ? 'Atendido' : 'Nuevo'} tono={r.atendido ? 'green' : 'red'} />
              <Text style={styles.hora}>{r.hora}</Text>
            </View>
            <Text style={styles.titulo}>{r.titulo}</Text>
            <Text style={styles.detalle}>
              {r.clasificacion} · {r.confianza}%
            </Text>
            <Text style={styles.ubicacion}>{r.ubicacion}</Text>

            {!r.atendido && (
              <TouchableOpacity style={styles.atender} onPress={() => marcarAtendido(r.id)}>
                <Text style={styles.atenderTexto}>Marcar como atendido</Text>
                <Ionicons name="checkmark" size={15} color={colores.azulClaro} />
              </TouchableOpacity>
            )}
          </View>
        </Tarjeta>
      ))}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  vacio: { textAlign: 'center', color: colores.gris, marginVertical: 20 },
  reporte: { flexDirection: 'row', gap: 12 },
  miniatura: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: colores.tarjeta2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  hora: { color: colores.gris, fontSize: 11 },
  titulo: { color: colores.texto, fontWeight: '700', fontSize: 14 },
  detalle: { color: colores.gris, fontSize: 12, marginTop: 2 },
  ubicacion: { color: colores.gris, fontSize: 12, marginTop: 2 },
  atender: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  atenderTexto: { color: colores.azulClaro, fontWeight: '700', fontSize: 12 },
});

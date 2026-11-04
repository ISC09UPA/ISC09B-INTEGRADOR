import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import BarrasGrafica from '../components/BarrasGrafica';
import { getFlujo, getPrediccion, getComparativo } from '../services/estadisticasService';
import { colores } from '../constants/theme';

const TABS = ['Flujo', 'Predicción', 'Comparativo'];

export default function EstadisticasScreen() {
  const [tab, setTab] = useState('Flujo');
  const [flujo, setFlujo] = useState(null);
  const [prediccion, setPrediccion] = useState(null);
  const [comparativo, setComparativo] = useState(null);
  const [error, setError] = useState('');

  async function cargarEstadisticas() {
    try {
      const [f, p, c] = await Promise.all([getFlujo(), getPrediccion(), getComparativo()]);
      setFlujo(f);
      setPrediccion(p);
      setComparativo(c);
      setError('');
    } catch (err) {
      setError('No se pudieron cargar las estadísticas');
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargarEstadisticas();
    }, [])
  );

  return (
    <Pantalla error={error} onRefrescar={cargarEstadisticas}>
      <Encabezado titulo="Estadísticas" subtitulo="Últimas 24 horas" />

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActiva]} onPress={() => setTab(t)}>
            <Text style={[styles.tabTexto, tab === t && styles.tabTextoActivo]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'Flujo' && flujo && (
        <>
          <Tarjeta>
            <View style={styles.metricaCabecera}>
              <View>
                <Text style={styles.metricaTitulo}>Flujo vehicular</Text>
                <Text style={styles.metricaNumero}>{flujo.total.toLocaleString()}</Text>
                <Text style={styles.metricaSub}>vehículos hoy</Text>
              </View>
              <Etiqueta texto={`↑ ${flujo.variacion}%`} tono="green" />
            </View>
            <BarrasGrafica etiquetas={flujo.etiquetas} valores={flujo.barras} />
          </Tarjeta>

          <Tarjeta style={styles.insight}>
            <View style={styles.icono}>
              <Ionicons name="sparkles-outline" size={20} color={colores.azulClaro} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.h3}>Hora pico detectada</Text>
              <Text style={styles.metricaSub}>{flujo.horaPico}</Text>
            </View>
          </Tarjeta>
        </>
      )}

      {tab === 'Predicción' && prediccion && (
        <Tarjeta>
          <View style={styles.metricaCabecera}>
            <View>
              <Text style={styles.metricaTitulo}>Próxima hora</Text>
              <Text style={styles.metricaNumero}>{prediccion.nivel}</Text>
              <Text style={styles.metricaSub}>congestión estimada</Text>
            </View>
            <Etiqueta texto={`${prediccion.porcentaje}%`} tono="red" />
          </View>
          <BarrasGrafica
            etiquetas={prediccion.horas.map((h) => h.hora)}
            valores={prediccion.horas.map((h) => h.porcentaje)}
          />
          <Text style={styles.ayuda}>Porcentaje de congestión que estima el modelo para cada hora.</Text>
        </Tarjeta>
      )}

      {tab === 'Comparativo' && comparativo && (
        <Tarjeta>
          <View style={styles.metricaCabecera}>
            <View>
              <Text style={styles.metricaTitulo}>Tiempo de espera</Text>
              <Text style={styles.metricaNumero}>−{comparativo.mejoraPorcentaje}%</Text>
              <Text style={styles.metricaSub}>con modo adaptativo</Text>
            </View>
            <Etiqueta texto="Mejora" tono="green" />
          </View>
          <BarrasGrafica
            etiquetas={comparativo.etiquetas}
            valores={comparativo.adaptativo}
            valores2={comparativo.fijo}
          />
          <View style={styles.leyenda}>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaPunto, { backgroundColor: '#475569' }]} />
              <Text style={styles.leyendaTexto}>Modo fijo</Text>
            </View>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaPunto, { backgroundColor: colores.azul }]} />
              <Text style={styles.leyendaTexto}>Adaptativo</Text>
            </View>
          </View>
        </Tarjeta>
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colores.tarjeta, borderRadius: 14, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActiva: { backgroundColor: colores.azul },
  tabTexto: { color: colores.gris, fontWeight: '600', fontSize: 13 },
  tabTextoActivo: { color: colores.texto },
  metricaCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metricaTitulo: { color: colores.gris, fontSize: 13 },
  metricaNumero: { color: colores.texto, fontSize: 32, fontWeight: '700', marginVertical: 2 },
  metricaSub: { color: colores.gris, fontSize: 12 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h3: { color: colores.texto, fontWeight: '700', fontSize: 14 },
  ayuda: { color: colores.gris, fontSize: 12, marginTop: 12 },
  leyenda: { flexDirection: 'row', gap: 18, marginTop: 14 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaPunto: { width: 10, height: 10, borderRadius: 3 },
  leyendaTexto: { color: colores.gris, fontSize: 12 },
});

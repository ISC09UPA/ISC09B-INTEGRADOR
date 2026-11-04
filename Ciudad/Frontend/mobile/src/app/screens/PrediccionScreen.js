import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import BarrasGrafica from '../components/BarrasGrafica';
import { getPrediccion } from '../services/estadisticasService';
import { colores, colorSemaforo } from '../constants/theme';

export default function PrediccionScreen() {
  const [prediccion, setPrediccion] = useState(null);
  const [error, setError] = useState('');

  async function cargarPrediccion() {
    try {
      const datos = await getPrediccion();
      setPrediccion(datos);
      setError('');
    } catch (err) {
      setError('No se pudo cargar la predicción');
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargarPrediccion();
    }, [])
  );

  return (
    <Pantalla error={error} onRefrescar={cargarPrediccion}>
      <Encabezado titulo="Predicción" subtitulo="Planea mejor tu ruta" />

      {prediccion && (
        <>
          <Tarjeta>
            <View style={styles.heroTop}>
              <View style={styles.icono}>
                <Ionicons name="sparkles-outline" size={20} color={colores.azulClaro} />
              </View>
              <Etiqueta texto="Próxima hora" tono="yellow" />
            </View>
            <Text style={styles.sub}>Congestión estimada</Text>
            <Text style={styles.nivel}>
              {prediccion.nivel} <Text style={styles.porcentaje}>{prediccion.porcentaje}%</Text>
            </Text>
            <BarrasGrafica
              etiquetas={prediccion.horas.map((h) => h.hora)}
              valores={prediccion.horas.map((h) => h.porcentaje)}
            />
          </Tarjeta>

          <Tarjeta style={styles.recomendacion}>
            <View style={styles.icono}>
              <Ionicons name="time-outline" size={20} color={colores.verde} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sub}>Mejor momento para transitar</Text>
              <Text style={styles.h3}>{prediccion.mejorMomento}</Text>
              <Text style={styles.ahorro}>{prediccion.ahorro}</Text>
            </View>
          </Tarjeta>

          <Text style={[styles.h2, { marginBottom: 12 }]}>Pronóstico por hora</Text>
          <View style={styles.horas}>
            {prediccion.horas.map((h) => (
              <View key={h.hora} style={styles.hora}>
                <Text style={styles.sub}>{h.hora}</Text>
                <Text style={styles.horaNumero}>{h.porcentaje}%</Text>
                <View style={[styles.punto, { backgroundColor: colorSemaforo[h.color] }]} />
              </View>
            ))}
          </View>
        </>
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { color: colores.gris, fontSize: 12 },
  nivel: { color: colores.texto, fontSize: 30, fontWeight: '700', marginTop: 2 },
  porcentaje: { color: colores.amarillo, fontSize: 18 },
  recomendacion: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h2: { color: colores.texto, fontSize: 17, fontWeight: '700' },
  h3: { color: colores.texto, fontSize: 16, fontWeight: '700', marginVertical: 2 },
  ahorro: { color: colores.verde, fontSize: 12 },
  horas: { flexDirection: 'row', gap: 10 },
  hora: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: '#26354b',
    borderRadius: 14,
    paddingVertical: 14,
  },
  horaNumero: { color: colores.texto, fontWeight: '700', fontSize: 16 },
  punto: { width: 8, height: 8, borderRadius: 4 },
});

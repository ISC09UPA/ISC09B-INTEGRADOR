/**
 * Pantalla 6: Historial (pestaña «Historial»).
 * Evolución de los sensores con control de periodo (24 h / 7 días / 30 días),
 * gráficas de área suavizadas y estadísticas mínimo/promedio/máximo.
 * Incluye la tarjeta de humedad ambiental (observación del documento).
 */
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import {
  AreaChart,
  Card,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
} from '../../components';
import { ESTADISTICAS_HISTORIAL } from '../../data/mock';
import { colors, radii, spacing, typography } from '../../theme';
import { luxCompacto } from '../../utils/formatters';

const PERIODOS = [
  { label: '24 h', value: '24h' },
  { label: '7 días', value: '7d' },
  { label: '30 días', value: '30d' },
];

/** Configuración de cada tarjeta de sensor. */
const TARJETAS = [
  {
    clave: 'suelo',
    nombre: 'Humedad del suelo',
    color: colors.soil,
    valorActual: (v) => `${v} %`,
    formatoEstadistica: (v) => `${Math.round(v)}%`,
  },
  {
    clave: 'temperatura',
    nombre: 'Temperatura',
    color: colors.temperature,
    valorActual: (v) => `${v} °C`,
    formatoEstadistica: (v) => `${Math.round(v)}°`,
  },
  {
    clave: 'ambiente',
    nombre: 'Humedad ambiental',
    color: colors.ambient,
    valorActual: (v) => `${v} %`,
    formatoEstadistica: (v) => `${Math.round(v)}%`,
  },
  {
    clave: 'luminosidad',
    nombre: 'Luminosidad',
    color: colors.light,
    valorActual: (v) => `${luxCompacto(v)}k lux`,
    formatoEstadistica: (v) => luxCompacto(v),
  },
];

/** Mínimo, promedio y máximo de una serie. */
function calcularEstadisticas(serie) {
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const promedio = serie.reduce((a, b) => a + b, 0) / serie.length;
  return { min, max, promedio };
}

/** Chip de variación con flecha (verde si positiva). */
function ChipVariacion({ variacion }) {
  const positiva = !variacion.startsWith('-');
  const color = positiva ? colors.success : colors.danger;
  return (
    <View style={[styles.chipVariacion, { backgroundColor: positiva ? colors.successBg : colors.dangerBg }]}>
      <Feather name={positiva ? 'trending-up' : 'trending-down'} size={12} color={color} />
      <Text style={[styles.chipVariacionTexto, { color }]}>{variacion}</Text>
    </View>
  );
}

export default function HistoryScreen({ route }) {
  const { historial, cargarHistorial, lecturas } = useApp();
  const scrollRef = useRef(null);
  const posiciones = useRef({}); // Posición Y de cada tarjeta (para el salto sugerido)

  const [periodo, setPeriodo] = useState(historial.periodo ?? '7d');

  // Carga (o recarga) la serie al cambiar el periodo.
  useEffect(() => {
    cargarHistorial(periodo);
  }, [periodo, cargarHistorial]);

  // Sugerido desde Inicio: al llegar con { sensor } se desplaza a esa tarjeta.
  const sensorDestino = route.params?.sensor;
  useEffect(() => {
    if (!sensorDestino || !posiciones.current[sensorDestino]) return undefined;
    const temporizador = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: posiciones.current[sensorDestino] - spacing.sm, animated: true });
    }, 350);
    return () => clearTimeout(temporizador);
  }, [sensorDestino, historial.datos]);

  const datos = historial.datos;
  const cargando = historial.cargando && !datos;

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Historial" subtitle="Evolución de los sensores" />

        {/* Control de periodo */}
        <SegmentedControl options={PERIODOS} value={periodo} onChange={setPeriodo} style={styles.segmento} />

        {cargando ? (
          // Estado cargando: skeletons de las tarjetas
          <View style={styles.lista}>
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <Skeleton width="50%" height={16} />
                <Skeleton width={90} height={28} style={styles.skeleton} />
                <Skeleton width="100%" height={110} radius={radii.sm} style={styles.skeleton} />
              </Card>
            ))}
          </View>
        ) : !datos || !datos.suelo?.length ? (
          // Estado sin datos para el periodo
          <View style={styles.sinDatos}>
            <Text style={styles.sinDatosTexto}>Aún no hay datos para este periodo</Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {TARJETAS.map((tarjeta) => {
              const serie = datos[tarjeta.clave];
              if (!serie) return null;
              const stats = calcularEstadisticas(serie);
              const lecturaActual = lecturas?.[tarjeta.clave]?.valor;
              const variacion = ESTADISTICAS_HISTORIAL[tarjeta.clave]?.variacion ?? '0%';

              return (
                <View
                  key={tarjeta.clave}
                  onLayout={(evento) => {
                    posiciones.current[tarjeta.clave] = evento.nativeEvent.layout.y;
                  }}
                >
                  <Card>
                    <View style={styles.tarjetaSuperior}>
                      <Text style={styles.tarjetaNombre}>{tarjeta.nombre}</Text>
                      <ChipVariacion variacion={variacion} />
                    </View>

                    <Text style={styles.tarjetaValor}>
                      {lecturaActual !== undefined ? tarjeta.valorActual(lecturaActual) : '—'}
                    </Text>

                    <AreaChart
                      series={serie}
                      labels={datos.etiquetas}
                      height={120}
                      color={tarjeta.color}
                      formatoValor={tarjeta.formatoEstadistica}
                    />

                    <View style={styles.separador} />

                    {/* Mínimo / Promedio / Máximo */}
                    <View style={styles.estadisticas}>
                      {[
                        { etiqueta: 'Mínimo', valor: tarjeta.formatoEstadistica(stats.min) },
                        { etiqueta: 'Promedio', valor: tarjeta.formatoEstadistica(stats.promedio) },
                        { etiqueta: 'Máximo', valor: tarjeta.formatoEstadistica(stats.max) },
                      ].map((columna) => (
                        <View key={columna.etiqueta} style={styles.columna}>
                          <Text style={styles.columnaEtiqueta}>{columna.etiqueta}</Text>
                          <Text style={styles.columnaValor}>{columna.valor}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    padding: spacing.screen,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  segmento: {
    marginTop: -spacing.xs,
  },
  lista: {
    gap: spacing.lg,
  },
  skeleton: {
    marginTop: spacing.lg,
  },
  sinDatos: {
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  sinDatosTexto: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tarjetaSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  tarjetaNombre: {
    ...typography.section,
    color: colors.textPrimary,
    flex: 1,
  },
  chipVariacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  chipVariacionTexto: {
    ...typography.micro,
    fontWeight: '700',
  },
  tarjetaValor: {
    ...typography.value,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  estadisticas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  columna: {
    flex: 1,
    gap: 2,
  },
  columnaEtiqueta: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  columnaValor: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
});

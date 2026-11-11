/**
 * Pantalla 5: Estado de la planta (pestaña «Planta»).
 * Foto reciente con etiqueta de fecha, botón «Tomar nueva foto»,
 * resumen «Condición actual» con chips por lectura y tarjeta de
 * estimación de crecimiento (experimental).
 */
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import {
  Card,
  ScreenHeader,
  SecondaryButton,
  SectionHeader,
  Skeleton,
  StatusChip,
} from '../../components';
import { colors, radii, spacing, typography } from '../../theme';
import { luxCompleto } from '../../utils/formatters';
import { estadoLectura, estadoPlanta } from '../../utils/plantStatus';

/** Etiqueta del chip global de la condición de la planta. */
const ETIQUETA_GLOBAL = {
  saludable: 'Óptima',
  atencion: 'Atención',
  critico: 'Crítico',
};

/** Configuración de las 4 filas de «Condición actual». */
const FILAS_LECTURAS = [
  { clave: 'suelo', nombre: 'Humedad del suelo', color: colors.soil, unidad: '%', formato: (v) => `${v} %` },
  { clave: 'temperatura', nombre: 'Temperatura', color: colors.temperature, unidad: '°C', formato: (v) => `${v} °C` },
  { clave: 'ambiente', nombre: 'Humedad ambiental', color: colors.ambient, unidad: '%', formato: (v) => `${v} %` },
  { clave: 'luminosidad', nombre: 'Luminosidad', color: colors.light, unidad: 'lux', formato: (v) => `${luxCompleto(v)} lux` },
];

export default function PlantScreen({ navigation }) {
  const { plantaActiva, lecturas, lecturasCargando, galeria, agregarFoto, mostrarToast } = useApp();

  const [tomandoFoto, setTomandoFoto] = useState(false);
  const [fotoVisible, setFotoVisible] = useState(false);

  const planta = plantaActiva;
  const foto = galeria.fotoPlanta;
  const estadoGlobal = lecturas ? estadoPlanta(lecturas) : null;

  /** Solicita una foto nueva (cámara del invernadero o del teléfono). */
  const tomarFoto = async () => {
    setTomandoFoto(true);
    try {
      await agregarFoto();
      mostrarToast('exito', 'Foto capturada y agregada a la galería.');
    } catch (error) {
      mostrarToast('error', error.message);
    } finally {
      setTomandoFoto(false);
    }
  };

  // Sugerido: la cuadrícula abre «Plantas y dispositivos» para cambiar de planta.
  const abrirPlantas = () => navigation.navigate('Más', { screen: 'PlantasDispositivos' });

  // Abre la galería de fotos de la planta activa (nueva pantalla).
  const abrirGaleriaPlanta = () =>
    navigation.navigate('Más', {
      screen: 'GaleriaPlanta',
      params: { plantaId: planta.id, nombre: planta.nombre },
    });

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {/* Encabezado con botón de cuadrícula */}
        <ScreenHeader
          title="Estado de la planta"
          subtitle={planta ? `${planta.nombre} · ${planta.especie}` : ''}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar de planta"
              onPress={abrirPlantas}
              style={({ pressed }) => [styles.botonCuadricula, pressed && styles.pulsado]}
            >
              <Feather name="grid" size={18} color={colors.primary} />
            </Pressable>
          }
        />

        {/* Foto reciente (o placeholder sin foto) */}
        {foto ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver foto a pantalla completa"
            onPress={() => setFotoVisible(true)}
            style={({ pressed }) => [pressed && styles.pulsado]}
          >
            <LinearGradient
              colors={[foto.color, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.foto}
            >
              <Ionicons name="leaf" size={56} color="rgba(255, 255, 255, 0.45)" />
            </LinearGradient>
            <View style={styles.fotoEtiqueta}>
              <Text style={styles.fotoEtiquetaTexto}>{foto.etiqueta}</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.sinFoto}>
            <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.sinFotoTexto}>Aún no hay fotos</Text>
          </View>
        )}

        <SecondaryButton
          label="Tomar nueva foto"
          icon="camera"
          onPress={tomarFoto}
          loading={tomandoFoto}
        />

        {/* Galería de fotos de esta planta (solo visible si hay planta activa) */}
        {planta ? (
          <SecondaryButton
            label="Ver galería de esta planta"
            icon="image"
            onPress={abrirGaleriaPlanta}
          />
        ) : null}

        {/* Condición actual con chip global */}
        <SectionHeader
          title="Condición actual"
          right={
            estadoGlobal ? (
              <StatusChip label={ETIQUETA_GLOBAL[estadoGlobal.estado]} tone={estadoGlobal.tone} />
            ) : null
          }
          style={styles.seccion}
        />

        {lecturasCargando && !lecturas ? (
          <Card padded={false}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.filaSkeleton}>
                <Skeleton width={10} height={10} radius={5} />
                <Skeleton width="55%" height={14} />
                <Skeleton width={70} height={14} />
              </View>
            ))}
          </Card>
        ) : lecturas ? (
          <Card padded={false}>
            {FILAS_LECTURAS.map((fila, indice) => {
              const lectura = lecturas[fila.clave];
              const estado = estadoLectura(fila.clave, lectura.valor);
              return (
                <View key={fila.clave}>
                  <View style={styles.filaLectura}>
                    <View style={[styles.punto, { backgroundColor: fila.color }]} />
                    <Text style={styles.filaNombre}>{fila.nombre}</Text>
                    <Text style={styles.filaValor}>{fila.formato(lectura.valor)}</Text>
                    <StatusChip label={estado.etiqueta} tone={estado.tone} />
                  </View>
                  {indice < FILAS_LECTURAS.length - 1 ? <View style={styles.divisor} /> : null}
                </View>
              );
            })}
          </Card>
        ) : (
          <Text style={styles.sinLecturas}>No hay lecturas disponibles.</Text>
        )}

        {/* Estimación de crecimiento */}
        <Card>
          <View style={styles.filaTitulo}>
            <Text style={styles.tituloTarjeta}>Estimación de crecimiento</Text>
            <StatusChip label="Experimental" tone="warning" />
          </View>

          {lecturas ? (
            // Con suficientes datos se muestra la estimación
            <>
              <Text style={styles.estimacionValor}>+3.2 cm</Text>
              <Text style={styles.estimacionTexto}>en los próximos 7 días</Text>
            </>
          ) : null}

          <View style={styles.nota}>
            <Text style={styles.notaTexto}>
              Estimación orientativa. Aún no hay suficientes datos históricos para una predicción
              precisa.
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Visor de foto a pantalla completa (sugerido) */}
      <Modal
        visible={fotoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoVisible(false)}
      >
        <View style={styles.visor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar foto"
            onPress={() => setFotoVisible(false)}
            style={styles.visorCerrar}
          >
            <Feather name="x" size={22} color={colors.white} />
          </Pressable>
          {foto ? (
            <LinearGradient
              colors={[foto.color, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.visorFoto}
            >
              <Ionicons name="leaf" size={72} color="rgba(255, 255, 255, 0.45)" />
            </LinearGradient>
          ) : null}
          <Text style={styles.visorFecha}>{foto?.etiqueta}</Text>
        </View>
      </Modal>
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
  botonCuadricula: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsado: {
    opacity: 0.8,
  },
  foto: {
    width: '100%',
    height: 210,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fotoEtiqueta: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    backgroundColor: 'rgba(10, 30, 18, 0.55)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  fotoEtiquetaTexto: {
    ...typography.captionBold,
    color: colors.white,
  },
  sinFoto: {
    width: '100%',
    height: 210,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sinFotoTexto: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  seccion: {
    marginTop: spacing.sm,
  },
  filaSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  filaLectura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filaNombre: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  filaValor: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 10 + spacing.md,
  },
  sinLecturas: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  tituloTarjeta: {
    ...typography.section,
    color: colors.textPrimary,
  },
  estimacionValor: {
    ...typography.bigValue,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  estimacionTexto: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  nota: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  notaTexto: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  visor: {
    flex: 1,
    backgroundColor: 'rgba(8, 18, 12, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  visorCerrar: {
    position: 'absolute',
    top: 48,
    right: spacing.xl,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visorFoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  visorFecha: {
    ...typography.captionBold,
    color: colors.white,
    marginTop: spacing.lg,
  },
});

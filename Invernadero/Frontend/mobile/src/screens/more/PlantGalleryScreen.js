/**
 * Galería de fotos de una planta específica (nueva pantalla).
 * Recibe el id y el nombre de la planta por parámetros de ruta y muestra
 * únicamente las fotos asociadas a esa planta, en una cuadrícula con el
 * mismo estilo visual de la galería general (sin modificar esta última).
 */
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { listarFotosPorPlanta } from '../../services/galleryService';
import { EmptyState, ScreenHeader } from '../../components';
import { colors, radii, spacing, typography } from '../../theme';

export default function PlantGalleryScreen({ navigation, route }) {
  // Parámetros de ruta: identificador y nombre de la planta.
  const { plantaId, nombre = 'Planta' } = route.params ?? {};

  const [fotos, setFotos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [reintento, setReintento] = useState(0); // Dispara una recarga al reintentar

  /**
   * Carga las fotos de la planta al montar la pantalla (y en cada reintento).
   * El estado solo cambia al resolverse la petición, nunca de forma síncrona
   * dentro del efecto.
   */
  useEffect(() => {
    let activo = true;

    async function cargarFotos() {
      try {
        const resultado = await listarFotosPorPlanta(plantaId);
        if (!activo) return;
        setFotos(resultado);
        setError(false);
      } catch {
        if (!activo) return;
        setError(true);
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarFotos();

    return () => {
      activo = false;
    };
  }, [plantaId, reintento]);

  /** Reintento desde el estado de error. */
  const reintentar = () => {
    setCargando(true);
    setReintento((n) => n + 1);
  };

  /** Encabezado: botón de regreso + nombre de la planta. */
  const encabezado = (
    <ScreenHeader
      title={nombre}
      subtitle="Galería de la planta"
      left={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.volver, pressed && styles.pulsado]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={20} color={colors.primary} />
        </Pressable>
      }
      style={styles.encabezado}
    />
  );

  /** Estado cargando: skeletons cuadrados (mismo patrón de Galería). */
  if (cargando && fotos.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.pantalla}>
        <View style={styles.contenidoSkeleton}>
          {encabezado}
          <View style={styles.cuadricula}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[styles.skeletonCuadrado, { backgroundColor: colors.surfaceMuted }]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <FlatList
        data={fotos}
        keyExtractor={(foto) => foto.id}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={styles.foto}>
            <LinearGradient
              colors={[item.color, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fotoFondo}
            >
              <Ionicons name="leaf" size={30} color="rgba(255, 255, 255, 0.4)" />
            </LinearGradient>
            <View style={styles.fotoEtiqueta}>
              <Text style={styles.fotoEtiquetaTexto}>{item.etiqueta}</Text>
            </View>
          </View>
        )}
        columnWrapperStyle={fotos.length > 0 ? styles.fila : null}
        contentContainerStyle={styles.contenido}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon="wifi-off"
              title="No se pudieron cargar las fotos"
              description="Inténtalo de nuevo en un momento."
              actionLabel="Reintentar"
              onAction={reintentar}
            />
          ) : (
            <EmptyState
              icon="camera"
              title="Esta planta aún no tiene fotos"
              description="Las fotos de seguimiento de esta planta aparecerán aquí."
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />
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
    gap: spacing.md,
  },
  contenidoSkeleton: {
    padding: spacing.screen,
    gap: spacing.lg,
  },
  encabezado: {
    paddingBottom: spacing.sm,
  },
  volver: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsado: {
    opacity: 0.7,
  },
  fila: {
    gap: spacing.md,
  },
  foto: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  fotoFondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoEtiqueta: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: 'rgba(10, 30, 18, 0.55)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fotoEtiquetaTexto: {
    ...typography.micro,
    fontWeight: '700',
    color: colors.white,
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  skeletonCuadrado: {
    flexBasis: '47%',
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
  },
});

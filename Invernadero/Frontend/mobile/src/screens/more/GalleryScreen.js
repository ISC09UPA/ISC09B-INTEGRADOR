/**
 * Pantalla 9: Galería (dentro de Más).
 * Cuadrícula de 2 columnas con carga progresiva (paginación), visor a
 * pantalla completa con compartir/eliminar (sugerido) y mensaje de
 * seguimiento automático.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { EmptyState, ScreenHeader } from '../../components';
import { colors, radii, spacing, typography } from '../../theme';

const FOTOS_POR_PAGINA = 12; // Tamaño de página para la carga progresiva

export default function GalleryScreen() {
  const { galeria, galeriaCargando, agregarFoto, eliminarFoto, mostrarToast } = useApp();

  const [visibles, setVisibles] = useState(FOTOS_POR_PAGINA);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [tomando, setTomando] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null); // Foto abierta en el visor

  const fotos = galeria.fotos;
  const fotosVisibles = fotos.slice(0, visibles);

  /** Botón de cámara: toma una foto nueva y la antepone a la cuadrícula. */
  const tomarFoto = async () => {
    setTomando(true);
    try {
      await agregarFoto();
      mostrarToast('exito', 'Foto agregada a la galería.');
    } catch (error) {
      mostrarToast('error', error.message);
    } finally {
      setTomando(false);
    }
  };

  /** Paginación: carga la siguiente tanda al llegar al final del scroll. */
  const cargarMas = () => {
    if (cargandoMas || visibles >= fotos.length) return;
    setCargandoMas(true);
    setTimeout(() => {
      setVisibles((actual) => Math.min(actual + FOTOS_POR_PAGINA, fotos.length));
      setCargandoMas(false);
    }, 600);
  };

  const compartir = async () => {
    if (!seleccionada) return;
    try {
      await Share.share({ message: `Foto del invernadero · ${seleccionada.etiqueta}` });
    } catch {
      // El usuario canceló el diálogo de compartir.
    }
  };

  const borrar = async () => {
    if (!seleccionada) return;
    try {
      await eliminarFoto(seleccionada.id);
      setSeleccionada(null);
      mostrarToast('exito', 'Foto eliminada.');
    } catch (error) {
      mostrarToast('error', error.message);
    }
  };

  /** Encabezado con botón de cámara. */
  const encabezado = (
    <ScreenHeader
      title="Galería"
      subtitle="Seguimiento visual"
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tomar nueva foto"
          onPress={tomarFoto}
          disabled={tomando}
          style={({ pressed }) => [styles.botonCamara, pressed && styles.pulsado]}
        >
          {tomando ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="camera" size={18} color={colors.primary} />
          )}
        </Pressable>
      }
      style={styles.encabezado}
    />
  );

  /** Pie: mensaje de seguimiento automático + indicador de paginación. */
  const pie = (
    <View style={styles.pie}>
      {fotos.length > 0 ? (
        <View style={styles.auto}>
          <View style={styles.autoIcono}>
            <Feather name="camera" size={18} color={colors.primary} />
          </View>
          <Text style={styles.autoTitulo}>Seguimiento automático activo</Text>
          <Text style={styles.autoTexto}>
            La próxima foto se tomará mañana a las{' '}
            <Text style={styles.autoHora}>08:00</Text>.
          </Text>
        </View>
      ) : null}
      {cargandoMas ? (
        <ActivityIndicator color={colors.primary} style={styles.spinnerMas} />
      ) : null}
    </View>
  );

  /** Estado cargando: skeletons cuadrados. */
  if (galeriaCargando && fotos.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.pantalla}>
        <View style={styles.contenidoSkeleton}>
          {encabezado}
          <View style={styles.cuadricula}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.skeletonCuadrado, { backgroundColor: colors.surfaceMuted }]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <FlatList
        data={fotosVisibles}
        keyExtractor={(foto) => foto.id}
        numColumns={2}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Foto del ${item.etiqueta}`}
            onPress={() => setSeleccionada(item)}
            style={({ pressed }) => [styles.foto, pressed && styles.pulsado]}
          >
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
          </Pressable>
        )}
        columnWrapperStyle={styles.fila}
        contentContainerStyle={styles.contenido}
        ListHeaderComponent={encabezado}
        ListFooterComponent={pie}
        ListEmptyComponent={
          <EmptyState
            icon="camera"
            title="Aún no hay fotos"
            description="Toma la primera foto de seguimiento de tu cultivo."
            actionLabel="Tomar primera foto"
            onAction={tomarFoto}
          />
        }
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
      />

      {/* Visor a pantalla completa (sugerido) */}
      <Modal
        visible={seleccionada !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSeleccionada(null)}
      >
        <View style={styles.visor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar foto"
            onPress={() => setSeleccionada(null)}
            style={styles.visorCerrar}
          >
            <Feather name="x" size={22} color={colors.white} />
          </Pressable>

          {seleccionada ? (
            <LinearGradient
              colors={[seleccionada.color, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.visorFoto}
            >
              <Ionicons name="leaf" size={72} color="rgba(255, 255, 255, 0.45)" />
            </LinearGradient>
          ) : null}

          <Text style={styles.visorFecha}>{seleccionada?.etiqueta}</Text>

          <View style={styles.visorAcciones}>
            <Pressable
              accessibilityRole="button"
              onPress={compartir}
              style={({ pressed }) => [styles.visorAccion, pressed && styles.pulsado]}
            >
              <Feather name="share" size={18} color={colors.white} />
              <Text style={styles.visorAccionTexto}>Compartir</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={borrar}
              style={({ pressed }) => [styles.visorAccion, pressed && styles.pulsado]}
            >
              <Feather name="trash-2" size={18} color={colors.white} />
              <Text style={styles.visorAccionTexto}>Eliminar</Text>
            </Pressable>
          </View>
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
    gap: spacing.md,
  },
  contenidoSkeleton: {
    padding: spacing.screen,
    gap: spacing.lg,
  },
  encabezado: {
    paddingBottom: spacing.sm,
  },
  botonCamara: {
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
  pie: {
    marginTop: spacing.sm,
  },
  auto: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  autoIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  autoTitulo: {
    ...typography.section,
    color: colors.textPrimary,
  },
  autoTexto: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  autoHora: {
    color: colors.primary,
    fontWeight: '700',
  },
  spinnerMas: {
    marginVertical: spacing.md,
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
  visorAcciones: {
    flexDirection: 'row',
    gap: spacing.xxxl,
    marginTop: spacing.xl,
  },
  visorAccion: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  visorAccionTexto: {
    ...typography.captionBold,
    color: colors.white,
  },
});

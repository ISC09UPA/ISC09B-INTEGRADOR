/**
 * Pantalla 11: Nueva planta (dentro de Más).
 * Formulario con foto (cámara o galería), nombre, especie y dispositivo
 * asociado. Valida los campos y regresa a Plantas y dispositivos al guardar.
 */
import React, { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../context/AppContext';
import {
  ConfirmModal,
  PrimaryButton,
  ScreenHeader,
  TextField,
} from '../../components';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function NewPlantScreen({ navigation }) {
  const { dispositivo, crearPlanta, mostrarToast } = useApp();

  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState('');
  const [dispositivoId, setDispositivoId] = useState(null);
  const [foto, setFoto] = useState(null); // URI de la foto seleccionada
  const [visitados, setVisitados] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [selectorFoto, setSelectorFoto] = useState(false);
  const [selectorDispositivo, setSelectorDispositivo] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  // Bloqueo inmediato contra dobles toques en «Guardar planta». La referencia
  // cambia al instante, sin esperar el re-render que deshabilita el botón.
  const guardandoRef = useRef(false);

  /** Validaciones en vivo (nombre y especie obligatorios, dispositivo requerido). */
  const validaciones = {
    nombre: !nombre.trim() ? 'Ingresa el nombre de la planta.' : null,
    especie: !especie.trim() ? 'Ingresa el tipo o especie.' : null,
    dispositivo: !dispositivoId ? 'Selecciona un dispositivo.' : null,
  };
  const formularioValido = !validaciones.nombre && !validaciones.especie && !validaciones.dispositivo;
  const errorDe = (campo) => (visitados[campo] ? validaciones[campo] : null);

  /** Hay cambios sin guardar si se tocó cualquier campo o se agregó foto. */
  const hayCambios = !!(nombre || especie || dispositivoId || foto);

  /** Cámara del teléfono. */
  const tomarFoto = async () => {
    setSelectorFoto(false);
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        mostrarToast('error', 'Se necesita permiso de cámara para tomar la foto.');
        return;
      }
      const resultado = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!resultado.canceled && resultado.assets?.[0]) {
        setFoto(resultado.assets[0].uri);
      }
    } catch {
      mostrarToast('error', 'No se pudo abrir la cámara.');
    }
  };

  /** Galería del teléfono. */
  const elegirFoto = async () => {
    setSelectorFoto(false);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!resultado.canceled && resultado.assets?.[0]) {
        setFoto(resultado.assets[0].uri);
      }
    } catch {
      mostrarToast('error', 'No se pudo abrir la galería.');
    }
  };

  /** Regreso con confirmación si hay cambios sin guardar (sugerido). */
  const regresar = () => {
    if (hayCambios) {
      setConfirmarSalida(true);
    } else {
      navigation.goBack();
    }
  };

  const guardar = async () => {
    // Evita el doble envío: si ya hay una petición en curso (doble toque),
    // se ignora. Así no se crean plantas duplicadas ni se apilan dos
    // navigation.goBack() (el segundo regresaba una pantalla de más).
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      await crearPlanta({
        nombre: nombre.trim(),
        especie: especie.trim(),
        dispositivoId,
      });
      mostrarToast('exito', 'Planta creada correctamente.');
      navigation.goBack();
    } catch (error) {
      mostrarToast('error', error.message);
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="Nueva planta"
            subtitle="Información básica"
            left={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Regresar"
                onPress={regresar}
                style={({ pressed }) => [styles.volver, pressed && styles.pulsado]}
                hitSlop={8}
              >
                <Feather name="chevron-left" size={20} color={colors.primary} />
              </Pressable>
            }
          />

          {/* Zona para foto (recuadro punteado) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar foto de la planta"
            onPress={() => setSelectorFoto(true)}
            style={[styles.zonaFoto, foto && styles.zonaFotoConFoto]}
          >
            {foto ? (
              <Image source={{ uri: foto }} style={styles.fotoPreview} />
            ) : (
              <View style={styles.zonaFotoVacia}>
                <Ionicons name="camera-outline" size={28} color={colors.textTertiary} />
                <Text style={styles.zonaFotoTexto}>Agregar foto</Text>
              </View>
            )}
          </Pressable>

          <TextField
            label="Nombre de la planta"
            placeholder="Tomate del balcón"
            value={nombre}
            onChangeText={setNombre}
            onBlur={() => setVisitados((prev) => ({ ...prev, nombre: true }))}
            error={errorDe('nombre')}
          />

          <TextField
            label="Tipo o especie"
            placeholder="Tomate Cherry"
            value={especie}
            onChangeText={setEspecie}
            onBlur={() => setVisitados((prev) => ({ ...prev, especie: true }))}
            error={errorDe('especie')}
          />

          {/* Selector desplegable de dispositivo */}
          <View style={styles.campoDispositivo}>
            <Text style={styles.etiqueta}>Dispositivo asociado</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectorDispositivo(true)}
              style={[
                styles.selector,
                { borderColor: errorDe('dispositivo') ? colors.danger : colors.border },
              ]}
            >
              <Text
                style={[
                  styles.selectorTexto,
                  !dispositivoId && styles.selectorPlaceholder,
                ]}
              >
                {dispositivoId && dispositivo
                  ? `${dispositivo.nombre} · ${dispositivo.identificador}`
                  : 'Selecciona un dispositivo'}
              </Text>
              <Feather name="chevron-down" size={18} color={colors.textSecondary} />
            </Pressable>
            {errorDe('dispositivo') ? (
              <Text style={styles.error}>{errorDe('dispositivo')}</Text>
            ) : null}
          </View>

          <PrimaryButton
            label="Guardar planta"
            onPress={guardar}
            loading={guardando}
            disabled={!formularioValido}
            style={styles.botonGuardar}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Menú para agregar la foto (cámara o galería) */}
      <Modal
        visible={selectorFoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorFoto(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelectorFoto(false)}>
          <Pressable style={styles.hoja} onPress={() => {}}>
            <Text style={styles.hojaTitulo}>Agregar foto</Text>
            <Pressable
              accessibilityRole="button"
              onPress={tomarFoto}
              style={({ pressed }) => [styles.opcion, pressed && styles.pulsado]}
            >
              <Feather name="camera" size={18} color={colors.primary} />
              <Text style={styles.opcionTexto}>Tomar foto</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={elegirFoto}
              style={({ pressed }) => [styles.opcion, pressed && styles.pulsado]}
            >
              <Feather name="image" size={18} color={colors.primary} />
              <Text style={styles.opcionTexto}>Elegir de la galería</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Selector de dispositivo (lista de dispositivos registrados) */}
      <Modal
        visible={selectorDispositivo}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorDispositivo(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelectorDispositivo(false)}>
          <Pressable style={styles.hoja} onPress={() => {}}>
            <Text style={styles.hojaTitulo}>Dispositivo asociado</Text>
            {dispositivo ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDispositivoId(dispositivo.id);
                  setSelectorDispositivo(false);
                }}
                style={({ pressed }) => [styles.opcion, pressed && styles.pulsado]}
              >
                <Feather name="cpu" size={18} color={colors.primary} />
                <View style={styles.opcionTextos}>
                  <Text style={styles.opcionTexto}>{dispositivo.nombre}</Text>
                  <Text style={styles.opcionDetalle}>{dispositivo.identificador}</Text>
                </View>
                {dispositivoId === dispositivo.id ? (
                  <Feather name="check" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ) : (
              <Text style={styles.opcionDetalle}>No hay dispositivos registrados.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmación de descartar cambios (sugerido) */}
      <ConfirmModal
        visible={confirmarSalida}
        title="¿Descartar cambios?"
        message="Los cambios que hiciste no se guardarán."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirmarSalida(false);
          navigation.goBack();
        }}
        onCancel={() => setConfirmarSalida(false)}
        icon="alert-circle"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  contenido: {
    padding: spacing.screen,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
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
  zonaFoto: {
    height: 170,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textTertiary,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  zonaFotoConFoto: {
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  zonaFotoVacia: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  zonaFotoTexto: {
    ...typography.captionBold,
    color: colors.textTertiary,
  },
  fotoPreview: {
    width: '100%',
    height: '100%',
  },
  etiqueta: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  campoDispositivo: {
    gap: 0,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    gap: spacing.sm,
  },
  selectorTexto: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  selectorPlaceholder: {
    color: colors.textTertiary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  botonGuardar: {
    marginTop: spacing.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    ...shadows.tabBar,
  },
  hojaTitulo: {
    ...typography.section,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  opcionTextos: {
    flex: 1,
    gap: 2,
  },
  opcionTexto: {
    ...typography.body,
    color: colors.textPrimary,
  },
  opcionDetalle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

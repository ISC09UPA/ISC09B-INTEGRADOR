/**
 * Pantalla 2: Control de riego (pestaña «Riego»).
 * Estado de la bomba, riego automático (switch + umbral), riego manual
 * (stepper de duración), modal de confirmación «¿Iniciar riego?» y
 * acceso a «Historial y estadísticas».
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import {
  Card,
  ConfirmModal,
  IconBox,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  Skeleton,
  StatusChip,
  Stepper,
} from '../../components';
import { colors, radii, spacing, typography } from '../../theme';

/** Información mostrada según el estado de la bomba. */
function infoBomba(riego, dispositivoEnLinea) {
  const estado = riego?.bomba?.estado;
  if (estado === 'regando') {
    return { texto: 'Regando…', chip: 'Regando', tone: 'warning' };
  }
  if (estado === 'error') {
    return { texto: 'Error', chip: 'Error', tone: 'danger' };
  }
  if (estado === 'desconectada' || dispositivoEnLinea === false) {
    return { texto: 'Desconectada', chip: 'Desconectada', tone: 'info' };
  }
  return { texto: 'Lista para regar', chip: 'Conectada', tone: 'neutral' };
}

export default function WaterScreen({ navigation }) {
  const {
    riego,
    riegoCargando,
    dispositivo,
    eventosRiego,
    alternarRiegoAutomatico,
    ajustarUmbral,
    fijarDuracionManual,
    iniciarRiego,
    detenerRiego,
    mostrarToast,
  } = useApp();

  // Umbral local mientras se arrastra el slider (se guarda al soltar).
  const [umbralLocal, setUmbralLocal] = useState(riego?.umbral ?? 45);
  const [umbralExterno, setUmbralExterno] = useState(riego?.umbral ?? 45);

  // Patrón oficial de React para reflejar cambios externos del valor
  // (p. ej. cuando llega el estado del backend) sin usar efectos.
  if (riego && riego.umbral !== umbralExterno) {
    setUmbralExterno(riego.umbral);
    setUmbralLocal(riego.umbral);
  }

  const [modalVisible, setModalVisible] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [deteniendo, setDeteniendo] = useState(false);

  if (riegoCargando && !riego) {
    // Estado cargando de la pantalla.
    return (
      <SafeAreaView edges={['top']} style={styles.pantalla}>
        <View style={styles.encabezado}>
          <ScreenHeader title="Control de riego" subtitle="Bomba principal" divider />
        </View>
        <View style={styles.contenido}>
          <Skeleton width="100%" height={180} radius={radii.lg} />
          <Skeleton width="100%" height={220} radius={radii.lg} />
          <Skeleton width="100%" height={240} radius={radii.lg} />
        </View>
      </SafeAreaView>
    );
  }

  const bomba = infoBomba(riego, dispositivo?.enLinea);
  const regando = riego?.bomba?.estado === 'regando';
  const duracion = riego?.manualSegundos ?? 30;

  // El botón «Iniciar riego» solo está activo con la bomba lista.
  const bombaLista = riego?.bomba?.estado === 'ready' && dispositivo?.enLinea !== false;

  const alternarAutomatico = async (valor) => {
    try {
      await alternarRiegoAutomatico(valor);
    } catch (error) {
      mostrarToast('error', error.message);
    }
  };

  /** Se guarda el umbral al soltar el slider. */
  const guardarUmbral = async (valor) => {
    try {
      await ajustarUmbral(valor);
    } catch (error) {
      mostrarToast('error', error.message);
    }
  };

  /** Confirma el riego desde el modal y cierra al terminar. */
  const confirmarRiego = async () => {
    setConfirmando(true);
    try {
      await iniciarRiego(duracion);
      setModalVisible(false);
    } catch (error) {
      // Falla el envío de la orden: toast de error y cierre del modal.
      mostrarToast('error', error.message);
      setModalVisible(false);
    } finally {
      setConfirmando(false);
    }
  };

  const pararRiego = async () => {
    setDeteniendo(true);
    try {
      await detenerRiego();
    } catch (error) {
      mostrarToast('error', error.message);
    } finally {
      setDeteniendo(false);
    }
  };

  const riegosDelMes = eventosRiego.filter((e) => e.tipo !== 'Fallido').length;

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {/* Encabezado con línea divisoria */}
        <ScreenHeader title="Control de riego" subtitle="Bomba principal" divider style={styles.encabezado} />

        {/* Tarjeta de estado de la bomba */}
        <Card style={styles.tarjetaBomba}>
          <View style={styles.halo}>
            <View style={styles.iconoBomba}>
              <Feather name="droplet" size={26} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.etiquetaBomba}>Estado de la bomba</Text>
          <Text style={styles.textoBomba}>{bomba.texto}</Text>
          <StatusChip label={bomba.chip} tone={bomba.tone} dot />

          {regando ? (
            <>
              <Text style={styles.cuentaRegresiva}>
                La bomba se detendrá en {riego.bomba.segundosRestantes} s
              </Text>
              <SecondaryButton
                label="Detener riego"
                icon="square"
                variant="danger"
                onPress={pararRiego}
                loading={deteniendo}
                fullWidth={false}
                style={styles.detener}
              />
            </>
          ) : null}
        </Card>

        {/* Tarjeta de riego automático */}
        <Card>
          <View style={styles.filaTitulo}>
            <View style={styles.filaTituloTextos}>
              <Text style={styles.tituloTarjeta}>Riego automático</Text>
              <Text style={styles.subtituloTarjeta}>Según humedad del suelo</Text>
            </View>
            <Switch
              accessibilityLabel="Riego automático"
              value={riego?.automatico ?? false}
              onValueChange={alternarAutomatico}
              trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.separador} />

          {/* Umbral de humedad (se deshabilita si el automático está apagado) */}
          <View style={[styles.bloqueUmbral, !riego?.automatico && styles.deshabilitado]}>
            <View style={styles.filaUmbral}>
              <Text style={styles.subtituloTarjeta}>Umbral de humedad</Text>
              <Text style={styles.valorUmbral}>{riego?.umbral ?? 45}%</Text>
            </View>
            <Slider
              accessibilityLabel="Umbral de humedad"
              style={styles.slider}
              minimumValue={25}
              maximumValue={75}
              step={1}
              value={umbralLocal}
              onValueChange={setUmbralLocal}
              onSlidingComplete={guardarUmbral}
              disabled={!riego?.automatico}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.surfaceMuted}
              thumbTintColor={colors.primary}
            />
            <View style={styles.extremos}>
              <Text style={styles.extremoTexto}>25%</Text>
              <Text style={styles.extremoTexto}>75%</Text>
            </View>
          </View>
        </Card>

        {/* Tarjeta de riego manual */}
        <Card>
          <View style={styles.filaTitulo}>
            <Text style={styles.tituloTarjeta}>Riego manual</Text>
            <Text style={styles.subtituloTarjeta}>Máx. 2 min</Text>
          </View>
          <Text style={[styles.subtituloTarjeta, styles.ayuda]}>
            Selecciona cuánto tiempo quieres activar la bomba.
          </Text>

          <Stepper
            value={duracion}
            min={riego?.manualMin ?? 5}
            max={riego?.manualMax ?? 120}
            step={riego?.manualPaso ?? 5}
            unitLabel="segundos"
            onChange={fijarDuracionManual}
            style={styles.stepper}
          />

          <PrimaryButton
            icon="droplet"
            label="Iniciar riego"
            onPress={() => setModalVisible(true)}
            disabled={!bombaLista}
            style={styles.iniciar}
          />
        </Card>

        {/* Fila «Historial y estadísticas» */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Más', { screen: 'HistorialRiego' })}
          style={({ pressed }) => [styles.filaHistorial, pressed && styles.pulsado]}
        >
          <IconBox icon="bar-chart-2" size={38} />
          <View style={styles.filaHistorialTextos}>
            <Text style={styles.tituloTarjeta}>Historial y estadísticas</Text>
            <Text style={styles.subtituloTarjeta}>
              {riegosDelMes === 1 ? '1 riego este mes' : `${riegosDelMes} riegos este mes`}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textTertiary} />
        </Pressable>
      </ScrollView>

      {/* Modal de confirmación «¿Iniciar riego?» (Pantalla 4) */}
      <ConfirmModal
        visible={modalVisible}
        title="¿Iniciar riego?"
        message={
          <>
            La bomba funcionará durante <Text style={styles.duracionNegrita}>{duracion} segundos</Text>.
            Puedes detenerla en cualquier momento.
          </>
        }
        confirmLabel="Confirmar riego"
        onConfirm={confirmarRiego}
        onCancel={() => setModalVisible(false)}
        loading={confirmando}
        icon="droplet"
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
    gap: spacing.lg,
  },
  encabezado: {
    paddingBottom: spacing.lg,
  },
  tarjetaBomba: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  halo: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(23, 100, 60, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconoBomba: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquetaBomba: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  textoBomba: {
    ...typography.value,
    color: colors.textPrimary,
  },
  cuentaRegresiva: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  detener: {
    marginTop: spacing.lg,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  filaTituloTextos: {
    flex: 1,
    gap: 2,
  },
  tituloTarjeta: {
    ...typography.section,
    color: colors.textPrimary,
  },
  subtituloTarjeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
  bloqueUmbral: {
    gap: spacing.md,
  },
  deshabilitado: {
    opacity: 0.45, // Slider y etiquetas atenuados con el automático apagado
  },
  filaUmbral: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valorUmbral: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  extremos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
  },
  extremoTexto: {
    ...typography.micro,
    color: colors.textTertiary,
  },
  ayuda: {
    marginTop: spacing.sm,
  },
  stepper: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  iniciar: {
    marginTop: spacing.xs,
  },
  filaHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  filaHistorialTextos: {
    flex: 1,
    gap: 2,
  },
  pulsado: {
    opacity: 0.7,
  },
  duracionNegrita: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

/**
 * Pantalla 3: Historial de riego (dentro de Más / desde Control de riego).
 * Consumo semanal con gráfica de barras, lista de eventos recientes
 * filtrable por mes y estados vacío/cargando.
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
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import {
  BarChart,
  Card,
  EmptyState,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  StatusChip,
} from '../../components';
import { MESES } from '../../data/mock';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function WateringHistoryScreen({ navigation }) {
  const { consumo, eventosRiego, mesEventos, eventosRiegoCargando, cargarEventosRiego } = useApp();

  const [selectorVisible, setSelectorVisible] = useState(false);

  /** Cambia el mes y recarga la lista de eventos. */
  const seleccionarMes = async (mes) => {
    setSelectorVisible(false);
    if (mes !== mesEventos) {
      await cargarEventosRiego(mes);
    }
  };

  const variacion = consumo?.variacion ?? 0;
  const toneVariacion = variacion < 0 ? 'success' : variacion > 0 ? 'danger' : 'info';
  const etiquetaVariacion = `${variacion > 0 ? '+' : ''}${variacion}%`;

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {/* Encabezado con botón de regreso */}
        <ScreenHeader
          title="Historial de riego"
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

        {/* Consumo semanal */}
        {consumo ? (
          <Card>
            <View style={styles.filaTitulo}>
              <Text style={styles.tituloTarjeta}>Consumo semanal</Text>
              <StatusChip label={etiquetaVariacion} tone={toneVariacion} />
            </View>
            <Text style={styles.valorConsumo}>{consumo.totalLitros.toFixed(1)} L</Text>
            <BarChart
              data={consumo.dias.map((dia) => ({ etiqueta: dia.etiqueta, valor: dia.litros }))}
              height={150}
              formatoValor={(v) => `${v.toFixed(1)} L`}
            />
          </Card>
        ) : (
          <Card>
            <Skeleton width={120} height={14} />
            <Skeleton width={90} height={30} style={styles.skeletonConsumo} />
            <Skeleton width="100%" height={140} style={styles.skeletonConsumo} />
          </Card>
        )}

        {/* Eventos recientes con filtro de mes */}
        <SectionHeader
          title="Eventos recientes"
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar mes"
              onPress={() => setSelectorVisible(true)}
              style={({ pressed }) => [styles.filtroMes, pressed && styles.pulsado]}
            >
              <Text style={styles.filtroMesTexto}>{MESES[mesEventos - 1]}</Text>
              <Feather name="chevron-down" size={14} color={colors.primary} />
            </Pressable>
          }
          style={styles.seccion}
        />

        {eventosRiegoCargando ? (
          // Estado cargando de la lista
          <Card padded={false}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.filaSkeleton}>
                <Skeleton width={40} height={40} radius={20} />
                <View style={styles.filaSkeletonTextos}>
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="40%" height={12} />
                </View>
              </View>
            ))}
          </Card>
        ) : eventosRiego.length > 0 ? (
          <Card padded={false}>
            {eventosRiego.map((evento, indice) => {
              const fallido = evento.tipo === 'Fallido';
              return (
                <View key={evento.id}>
                  <View style={styles.filaEvento}>
                    <View
                      style={[
                        styles.iconoEvento,
                        { backgroundColor: fallido ? colors.dangerBg : colors.primaryLight },
                      ]}
                    >
                      <Feather
                        name={fallido ? 'x' : 'droplet'}
                        size={16}
                        color={fallido ? colors.danger : colors.primary}
                      />
                    </View>
                    <View style={styles.filaEventoTextos}>
                      <Text style={styles.filaEventoFecha}>{evento.fechaEtiqueta}</Text>
                      <Text style={styles.filaEventoDetalle}>
                        {evento.tipo} · {evento.duracion} · {evento.litros}
                      </Text>
                    </View>
                  </View>
                  {indice < eventosRiego.length - 1 ? <View style={styles.divisor} /> : null}
                </View>
              );
            })}
          </Card>
        ) : (
          <EmptyState
            icon="droplet"
            title="Aún no hay riegos registrados"
            description={`No se encontraron riegos en ${MESES[mesEventos - 1]}.`}
          />
        )}
      </ScrollView>

      {/* Selector de mes */}
      <Modal
        visible={selectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelectorVisible(false)}>
          <Pressable style={styles.hoja} onPress={() => {}}>
            <Text style={styles.hojaTitulo}>Mes</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {MESES.map((mes, indice) => {
                const numero = indice + 1;
                const seleccionado = numero === mesEventos;
                return (
                  <Pressable
                    key={mes}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionado }}
                    onPress={() => seleccionarMes(numero)}
                    style={({ pressed }) => [
                      styles.opcionMes,
                      pressed && styles.pulsado,
                    ]}
                  >
                    <Text style={[styles.opcionMesTexto, seleccionado && styles.opcionMesActiva]}>
                      {mes}
                    </Text>
                    {seleccionado ? (
                      <Feather name="check" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
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
  valorConsumo: {
    ...typography.bigValue,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  skeletonConsumo: {
    marginTop: spacing.lg,
  },
  seccion: {
    marginTop: spacing.sm,
  },
  filtroMes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  filtroMesTexto: {
    ...typography.captionBold,
    color: colors.primary,
  },
  filaSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  filaSkeletonTextos: {
    flex: 1,
    gap: spacing.sm,
  },
  filaEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconoEvento: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaEventoTextos: {
    flex: 1,
    gap: 2,
  },
  filaEventoFecha: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  filaEventoDetalle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 40 + spacing.md,
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
    maxHeight: '65%',
    ...shadows.tabBar,
  },
  hojaTitulo: {
    ...typography.section,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  opcionMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  opcionMesTexto: {
    ...typography.body,
    color: colors.textPrimary,
  },
  opcionMesActiva: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});

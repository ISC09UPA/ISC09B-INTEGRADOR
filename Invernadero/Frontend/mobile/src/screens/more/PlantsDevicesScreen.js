/**
 * Pantalla 10: Plantas y dispositivos (dentro de Más).
 * Lista de plantas con chip de conexión, tarjeta del dispositivo Raspberry Pi
 * y botón «+» para registrar una nueva planta.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import {
  Card,
  ConfirmModal,
  EmptyState,
  IconBox,
  ScreenHeader,
  StatusChip,
} from '../../components';
import { plural } from '../../utils/formatters';
import { colors, radii, spacing, typography } from '../../theme';

export default function PlantsDevicesScreen({ navigation }) {
  const { plantas, dispositivo, activarPlanta, mostrarToast } = useApp();

  const [dispositivoVisible, setDispositivoVisible] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);

  /** Sugerido: tocar una planta la define como planta activa. */
  const seleccionarPlanta = async (id) => {
    try {
      await activarPlanta(id);
      const planta = plantas.find((p) => p.id === id);
      mostrarToast('exito', `${planta?.nombre ?? 'Planta'} es ahora la planta activa.`);
    } catch (error) {
      mostrarToast('error', error.message);
    }
  };

  /** Sugerido: reinicio del dispositivo (simulado). */
  const reiniciar = async () => {
    setReiniciando(true);
    try {
      await new Promise((resolver) => setTimeout(resolver, 900));
      setDispositivoVisible(false);
      mostrarToast('exito', 'Reinicio enviado a la Raspberry Pi.');
    } finally {
      setReiniciando(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {/* Encabezado con botón «+» verde oscuro */}
        <ScreenHeader
          title="Plantas y dispositivos"
          subtitle={`${plantas.length} ${plural(plantas.length, 'planta registrada', 'plantas registradas')}`}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nueva planta"
              onPress={() => navigation.navigate('NuevaPlanta')}
              style={({ pressed }) => [styles.botonMas, pressed && styles.pulsado]}
            >
              <Feather name="plus" size={20} color={colors.white} />
            </Pressable>
          }
        />

        {/* Estado vacío sin plantas */}
        {plantas.length === 0 ? (
          <EmptyState
            icon="leaf"
            title="Aún no hay plantas"
            description="Registra tu primera planta para comenzar el monitoreo."
            actionLabel="Agregar planta"
            onAction={() => navigation.navigate('NuevaPlanta')}
          />
        ) : (
          <View style={styles.lista}>
            {plantas.map((planta) => (
              <Pressable
                key={planta.id}
                accessibilityRole="button"
                onPress={() => seleccionarPlanta(planta.id)}
                style={({ pressed }) => [pressed && styles.pulsado]}
              >
                <Card style={styles.tarjetaPlanta}>
                  <LinearGradient
                    colors={[planta.colorFoto, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fotoPlanta}
                  />
                  <View style={styles.plantaTextos}>
                    <Text style={styles.plantaNombre} numberOfLines={1}>
                      {planta.nombre}
                    </Text>
                    <Text style={styles.plantaUbicacion} numberOfLines={1}>
                      {planta.ubicacion}
                    </Text>
                    <StatusChip
                      label={planta.enLinea ? 'En línea' : 'Sin conexión'}
                      tone={planta.enLinea ? 'success' : 'info'}
                      dot
                    />
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.textTertiary} />
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        {/* Tarjeta del dispositivo */}
        {dispositivo ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDispositivoVisible(true)}
            style={({ pressed }) => [pressed && styles.pulsado]}
          >
            <Card style={styles.tarjetaDispositivo}>
              <IconBox icon="cpu" size={44} bg={colors.surfaceMuted} color={colors.textPrimary} />
              <View style={styles.plantaTextos}>
                <View style={styles.dispositivoFila}>
                  <Text style={styles.dispositivoEtiqueta}>{dispositivo.nombre}</Text>
                  <StatusChip label="Activo" tone="neutral" dot />
                </View>
                <Text style={styles.dispositivoId}>{dispositivo.identificador}</Text>
                <Text style={styles.dispositivoFirmware}>
                  Firmware {dispositivo.firmware} · {dispositivo.estado}
                </Text>
              </View>
            </Card>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Detalle del dispositivo (sugerido) */}
      <ConfirmModal
        visible={dispositivoVisible}
        title={`${dispositivo?.identificador} · ${dispositivo?.nombre}`}
        message={`Firmware ${dispositivo?.firmware} · ${dispositivo?.estado}\nEstado: Activo`}
        confirmLabel="Reiniciar dispositivo"
        cancelLabel="Cerrar"
        onConfirm={reiniciar}
        onCancel={() => setDispositivoVisible(false)}
        loading={reiniciando}
        icon="cpu"
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
  botonMas: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsado: {
    opacity: 0.8,
  },
  lista: {
    gap: spacing.md,
  },
  tarjetaPlanta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fotoPlanta: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
  },
  plantaTextos: {
    flex: 1,
    gap: 2,
  },
  plantaNombre: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  plantaUbicacion: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tarjetaDispositivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dispositivoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dispositivoEtiqueta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dispositivoId: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  dispositivoFirmware: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

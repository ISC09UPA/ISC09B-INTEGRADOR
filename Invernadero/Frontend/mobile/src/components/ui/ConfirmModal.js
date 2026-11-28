/**
 * Modal de confirmación («¿Iniciar riego?»).
 * Tarjeta blanca centrada sobre overlay oscurecido, botón «X» arriba,
 * icono, título, mensaje, botón primario (con carga) y enlace cancelar.
 * Se cierra al tocar fuera o con Cancelar/X.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import PrimaryButton from './PrimaryButton';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function ConfirmModal({
  visible = false,
  title = '',
  message = null, // Puede ser texto o un nodo React (para resaltar la duración)
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  error = null, // Mensaje de error mostrado bajo el contenido
  icon = 'droplet',
  iconBg = colors.primaryLight,
  iconColor = colors.primary,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Overlay: al tocarlo se cierra el modal */}
      <Pressable style={styles.overlay} onPress={onCancel}>
        {/* La tarjeta absorbe los toques para no cerrarse accidentalmente */}
        <Pressable style={styles.tarjeta} onPress={() => {}}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={onCancel}
            style={({ pressed }) => [styles.cerrar, pressed && styles.cerrarPulsado]}
            hitSlop={8}
          >
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={[styles.icono, { backgroundColor: iconBg }]}>
            <Feather name={icon} size={26} color={iconColor} />
          </View>

          <Text style={styles.titulo}>{title}</Text>
          {message ? <Text style={styles.mensaje}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={confirmLabel}
            onPress={onConfirm}
            loading={loading}
            style={styles.boton}
          />

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            disabled={loading}
            style={({ pressed }) => [styles.cancelar, pressed && styles.cancelarPulsado]}
          >
            <Text style={styles.cancelarTexto}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
    ...shadows.button,
  },
  cerrar: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarPulsado: {
    opacity: 0.6,
  },
  icono: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  titulo: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  mensaje: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  error: {
    ...typography.captionBold,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  boton: {
    marginTop: spacing.xs,
  },
  cancelar: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  cancelarPulsado: {
    opacity: 0.6,
  },
  cancelarTexto: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
});

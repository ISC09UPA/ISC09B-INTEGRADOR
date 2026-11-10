/**
 * Banner de «Modo sin conexión»: franja amarilla clara con icono de wifi,
 * texto en negritas, separador vertical y «Control local activo».
 * Solo se renderiza cuando la app opera contra la red local (sin internet).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';

export default function OfflineBanner({ visible = false, style }) {
  if (!visible) return null;

  return (
    <View style={[styles.banner, style]}>
      <Feather name="wifi-off" size={16} color={colors.warning} />
      <Text style={styles.texto}>Modo sin conexión</Text>
      <View style={styles.separador} />
      <Text style={styles.detalle}>Control local activo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  texto: {
    ...typography.captionBold,
    color: colors.warning,
  },
  separador: {
    width: 1,
    height: 16,
    backgroundColor: colors.warningBorder,
  },
  detalle: {
    ...typography.caption,
    color: colors.warning,
  },
});

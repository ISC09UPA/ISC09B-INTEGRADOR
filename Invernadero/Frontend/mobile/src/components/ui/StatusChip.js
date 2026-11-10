/**
 * Chip de estado en forma de pastilla (Saludable, Ideal, Conectada, Media…).
 * Admite un punto (dot) de color opcional, como en los mockups.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

const TONOS = {
  success: { texto: colors.success, fondo: colors.successBg, punto: colors.onlineDot },
  warning: { texto: colors.warning, fondo: colors.warningBg, punto: colors.warning },
  danger: { texto: colors.danger, fondo: colors.dangerBg, punto: colors.danger },
  info: { texto: colors.info, fondo: colors.infoBg, punto: colors.info },
  // Neutro: texto verde oscuro sobre verde claro (chips con punto gris)
  neutral: { texto: colors.primary, fondo: colors.primaryLight, punto: colors.offlineDot },
};

export default function StatusChip({ label, tone = 'success', dot = false, dotColor = null, style }) {
  const tono = TONOS[tone] ?? TONOS.neutral;

  return (
    <View style={[styles.chip, { backgroundColor: tono.fondo }, style]}>
      {dot ? (
        <View style={[styles.punto, { backgroundColor: dotColor ?? tono.punto }]} />
      ) : null}
      <Text style={[styles.texto, { color: tono.texto }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  punto: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  texto: {
    ...typography.micro,
    fontWeight: '700',
  },
});

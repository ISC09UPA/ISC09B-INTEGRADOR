/**
 * Recuadro de error rosa con icono X rojo (Login y Crear cuenta):
 * «Correo o contraseña incorrectos…», «Este correo ya está registrado», etc.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';

export default function ErrorBanner({ mensaje = null, style }) {
  if (!mensaje) return null;

  return (
    <View style={[styles.banner, style]}>
      <Feather name="x-circle" size={16} color={colors.danger} />
      <Text style={styles.texto}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  texto: {
    ...typography.captionBold,
    color: colors.danger,
    flex: 1,
  },
});

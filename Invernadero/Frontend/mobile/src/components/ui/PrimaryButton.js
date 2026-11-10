/**
 * Botón primario: ancho, verde oscuro, texto blanco en negritas y sombra.
 * Soporta icono, estado deshabilitado e indicador de carga (spinner).
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function PrimaryButton({
  label,
  onPress,
  icon = null, // Nombre de icono Feather (opcional)
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) {
  const inactivo = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: loading }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        fullWidth && styles.anchoCompleto,
        inactivo && styles.deshabilitado,
        pressed && styles.pulsado,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} size="small" />
      ) : (
        <View style={styles.contenido}>
          {icon ? <Feather name={icon} size={18} color={colors.onPrimary} style={styles.icono} /> : null}
          <Text style={styles.texto}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    ...shadows.button,
  },
  anchoCompleto: {
    alignSelf: 'stretch',
  },
  deshabilitado: {
    opacity: 0.45,
  },
  pulsado: {
    backgroundColor: colors.primaryDark,
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  icono: {
    marginRight: 0,
  },
  texto: {
    ...typography.button,
    color: colors.onPrimary,
  },
});

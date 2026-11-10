/**
 * Botón secundario con variantes:
 *  - 'light'  → fondo verde claro, texto verde oscuro («Tomar nueva foto», «Ver guía»)
 *  - 'danger' → fondo rosa claro, texto rojo oscuro («Cerrar sesión»)
 *  - 'outline'→ borde verde, texto verde oscuro
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';

const VARIANTES = {
  light: { fondo: colors.primaryLight, texto: colors.primary, spinner: colors.primary },
  danger: { fondo: colors.dangerBg, texto: colors.danger, spinner: colors.danger },
  outline: { fondo: colors.transparent, texto: colors.primary, spinner: colors.primary, borde: colors.primary },
};

export default function SecondaryButton({
  label,
  onPress,
  icon = null,
  variant = 'light',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) {
  const variante = VARIANTES[variant] ?? VARIANTES.light;
  const inactivo = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: loading }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        { backgroundColor: variante.fondo },
        variante.borde ? { borderWidth: 1.5, borderColor: variante.borde } : null,
        fullWidth && styles.anchoCompleto,
        inactivo && styles.deshabilitado,
        pressed && styles.pulsado,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variante.spinner} size="small" />
      ) : (
        <View style={styles.contenido}>
          {icon ? <Feather name={icon} size={18} color={variante.texto} /> : null}
          <Text style={[styles.texto, { color: variante.texto }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  anchoCompleto: {
    alignSelf: 'stretch',
  },
  deshabilitado: {
    opacity: 0.45,
  },
  pulsado: {
    opacity: 0.7,
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  texto: {
    ...typography.button,
  },
});

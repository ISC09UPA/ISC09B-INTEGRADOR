/**
 * Control segmentado («24 h», «7 días», «30 días»):
 * pastilla blanca sobre fondo gris verdoso.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function SegmentedControl({
  options = [], // [{ label, value }]
  value,
  onChange,
  style,
}) {
  return (
    <View style={[styles.contenedor, style]}>
      {options.map((opcion) => {
        const seleccionada = opcion.value === value;
        return (
          <Pressable
            key={opcion.value}
            accessibilityRole="button"
            accessibilityState={{ selected: seleccionada }}
            onPress={() => onChange(opcion.value)}
            style={[styles.opcion, seleccionada && styles.opcionSeleccionada]}
          >
            <Text style={[styles.texto, seleccionada && styles.textoSeleccionado]}>
              {opcion.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.xs,
  },
  opcion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  opcionSeleccionada: {
    backgroundColor: colors.surface,
    ...shadows.pill,
  },
  texto: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  textoSeleccionado: {
    color: colors.primary,
  },
});

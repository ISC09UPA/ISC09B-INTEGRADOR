/**
 * Stepper: selector «− / valor / +» con botones cuadrados verde claro.
 * Se deshabilitan los botones al llegar al mínimo o al máximo.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';

export default function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  unitLabel = '', // Leyenda bajo el valor («segundos»)
  style,
}) {
  const puedeBajar = value - step >= min;
  const puedeSubir = value + step <= max;

  return (
    <View style={[styles.contenedor, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Disminuir"
        accessibilityState={{ disabled: !puedeBajar }}
        disabled={!puedeBajar}
        onPress={() => onChange(value - step)}
        style={({ pressed }) => [
          styles.boton,
          !puedeBajar && styles.botonDeshabilitado,
          pressed && styles.botonPulsado,
        ]}
      >
        <Feather name="minus" size={20} color={colors.primary} />
      </Pressable>

      <View style={styles.centro}>
        <Text style={styles.valor}>{value}</Text>
        {unitLabel ? <Text style={styles.unidad}>{unitLabel}</Text> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aumentar"
        accessibilityState={{ disabled: !puedeSubir }}
        disabled={!puedeSubir}
        onPress={() => onChange(value + step)}
        style={({ pressed }) => [
          styles.boton,
          !puedeSubir && styles.botonDeshabilitado,
          pressed && styles.botonPulsado,
        ]}
      >
        <Feather name="plus" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  boton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPulsado: {
    opacity: 0.7,
  },
  botonDeshabilitado: {
    opacity: 0.35,
  },
  centro: {
    alignItems: 'center',
  },
  valor: {
    ...typography.bigValue,
    color: colors.textPrimary,
  },
  unidad: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
});

/**
 * Tarjeta de sensor: icono en cuadro de color suave, etiqueta,
 * valor grande y unidad pequeña. Con estado de carga (skeleton) y
 * variante compacta para la cuadrícula 2×2 de Inicio.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Skeleton from './Skeleton';
import { colors, radii, spacing, typography } from '../../theme';

const FAMILIAS = { Feather, Ionicons };

export default function SensorCard({
  icon = 'droplet',
  familia = 'Feather', // Feather (línea fina) o Ionicons (p. ej. «water-outline»)
  iconBg = colors.soilBg,
  iconColor = colors.soil,
  label = '',
  valor = null, // Valor grande mostrado junto a la unidad
  unidad = '',
  onPress = null,
  loading = false,
  hint = null, // Texto pequeño opcional bajo el valor
  style,
}) {
  const Familia = FAMILIAS[familia] ?? Feather;

  const contenido = (
    <>
      <View style={styles.superior}>
        <View style={[styles.icono, { backgroundColor: iconBg }]}>
          <Familia name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.etiqueta} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {loading ? (
        <>
          <Skeleton width={110} height={28} style={styles.skeleton} />
          <Skeleton width={60} height={12} style={styles.skeleton} />
        </>
      ) : (
        <View style={styles.valorFila}>
          <Text style={styles.valor} numberOfLines={1}>
            {valor}
          </Text>
          <Text style={styles.unidad}>{unidad}</Text>
        </View>
      )}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pulsado, style]}
      >
        <Card style={styles.tarjeta}>{contenido}</Card>
      </Pressable>
    );
  }

  return <Card style={style}>{contenido}</Card>;
}

const styles = StyleSheet.create({
  tarjeta: {
    flex: 1,
  },
  pressable: {
    flex: 1,
  },
  pulsado: {
    opacity: 0.8,
  },
  superior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  icono: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiqueta: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  valorFila: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs + 2,
  },
  valor: {
    ...typography.value,
    color: colors.textPrimary,
  },
  unidad: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  hint: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  skeleton: {
    marginTop: spacing.xs,
  },
});

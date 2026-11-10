/**
 * Caja cuadrada con icono de línea, con esquinas redondeadas y color suave.
 * Se usa en tarjetas de sensor, filas de menú y botones de encabezado.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../../theme';

const FAMILIAS = { Feather, Ionicons };

export default function IconBox({
  icon,
  familia = 'Feather',
  size = 40,
  iconSize = 18,
  bg = colors.primaryLight,
  color = colors.primary,
  radius = radii.md,
  style,
}) {
  const Familia = FAMILIAS[familia] ?? Feather;
  return (
    <View
      style={[
        styles.caja,
        { width: size, height: size, borderRadius: radius, backgroundColor: bg },
        style,
      ]}
    >
      <Familia name={icon} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

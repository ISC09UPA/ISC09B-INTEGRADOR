/**
 * Tarjeta base: superficie blanca con esquinas muy redondeadas y sombra suave.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

export default function Card({ children, padded = true, style, ...props }) {
  return (
    <View style={[styles.tarjeta, padded && styles.padded, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
});

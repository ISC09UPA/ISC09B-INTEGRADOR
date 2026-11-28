/**
 * Encabezado de sección: título en negritas con elemento opcional a la derecha
 * («Hace 2 min», filtro de mes, acción «Marcar leídas»…).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default function SectionHeader({
  title,
  right = null, // Texto o nodo React
  onRightPress = null,
  style,
}) {
  const derecha =
    onRightPress && typeof right === 'string' ? (
      <Pressable accessibilityRole="button" onPress={onRightPress} hitSlop={8}>
        <Text style={styles.accion}>{right}</Text>
      </Pressable>
    ) : (
      right
    );

  return (
    <View style={[styles.contenedor, style]}>
      <Text style={styles.titulo}>{title}</Text>
      {derecha}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titulo: {
    ...typography.section,
    color: colors.textPrimary,
  },
  accion: {
    ...typography.captionBold,
    color: colors.primary,
  },
});

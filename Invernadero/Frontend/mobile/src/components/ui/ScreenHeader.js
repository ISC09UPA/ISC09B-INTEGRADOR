/**
 * Encabezado de pantalla: título, subtítulo opcional, botones izquierdo
 * y derecho, y línea divisoria opcional (p. ej. Control de riego).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default function ScreenHeader({
  title,
  subtitle = null,
  left = null, // Elemento a la izquierda (botón de regreso)
  right = null, // Elemento a la derecha (botón de acción)
  divider = false,
  style,
}) {
  return (
    <View style={[styles.contenedor, divider && styles.conDivisor, style]}>
      {left ? <View style={styles.lateral}>{left}</View> : null}
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitulo} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.lateral}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  conDivisor: {
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lateral: {
    minWidth: 40,
    alignItems: 'center',
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitulo: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

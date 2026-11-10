/**
 * Fila de menú: icono en cuadro verde claro, título en negritas,
 * subtítulo gris y chevron a la derecha. Se usa en Más y Perfil.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import IconBox from './IconBox';
import { colors, radii, spacing, typography } from '../../theme';

export default function MenuRow({
  icon,
  title,
  subtitle = null,
  onPress,
  right = null, // Elemento opcional a la derecha (en lugar del chevron)
  disabled = false,
  style,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fila,
        pressed && styles.pulsado,
        disabled && styles.deshabilitado,
        style,
      ]}
    >
      <IconBox icon={icon} size={38} />
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
      {right ?? <Feather name="chevron-right" size={18} color={colors.textTertiary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
  },
  pulsado: {
    opacity: 0.6,
  },
  deshabilitado: {
    opacity: 0.4,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  subtitulo: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

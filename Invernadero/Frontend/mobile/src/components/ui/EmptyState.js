/**
 * Estado vacío: icono en círculo verde claro, título, descripción
 * y acción opcional.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import SecondaryButton from './SecondaryButton';
import { colors, spacing, typography } from '../../theme';

export default function EmptyState({
  icon = 'inbox',
  title = '',
  description = null,
  actionLabel = null,
  onAction = null,
  style,
}) {
  return (
    <View style={[styles.contenedor, style]}>
      <View style={styles.icono}>
        <Feather name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.titulo}>{title}</Text>
      {description ? <Text style={styles.descripcion}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <SecondaryButton
          label={actionLabel}
          onPress={onAction}
          fullWidth={false}
          style={styles.boton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  icono: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  titulo: {
    ...typography.section,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  descripcion: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  boton: {
    marginTop: spacing.lg,
  },
});

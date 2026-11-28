/**
 * Campo de texto de formulario con etiqueta, placeholder, estado de foco
 * resaltado, mensaje de error, texto de ayuda y botón mostrar/ocultar
 * contraseña. Se usa en Login, Crear cuenta y Nueva planta.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';

export default function TextField({
  label = null,
  placeholder = '',
  value = '',
  onChangeText,
  error = null, // Mensaje de error mostrado bajo el campo
  helper = null, // Texto de ayuda (solo visible si no hay error)
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  textContentType,
  onBlur,
  style,
  ...props
}) {
  const [oculto, setOculto] = useState(true); // Estado del «ojo» en contraseñas
  const [enfocado, setEnfocado] = useState(false);

  // Borde: rojo si hay error, verde al enfocar, gris en reposo.
  const colorBorde = error ? colors.danger : enfocado ? colors.primary : colors.border;

  return (
    <View style={[styles.contenedor, style]}>
      {label ? <Text style={styles.etiqueta}>{label}</Text> : null}

      <View style={[styles.caja, { borderColor: colorBorde }]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry && oculto}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          onFocus={() => setEnfocado(true)}
          onBlur={(evento) => {
            setEnfocado(false);
            if (onBlur) onBlur(evento);
          }}
          {...props}
        />

        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={oculto ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            onPress={() => setOculto((prev) => !prev)}
            hitSlop={8}
          >
            <Feather name={oculto ? 'eye' : 'eye-off'} size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.ayuda}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.sm,
  },
  etiqueta: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  ayuda: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

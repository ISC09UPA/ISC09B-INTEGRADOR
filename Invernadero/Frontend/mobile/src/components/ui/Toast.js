/**
 * Toast global: mensaje flotante superior que se auto-oculta.
 * Se controla desde el contexto (mostrarToast) y se monta una sola vez
 * en la raíz de la app.
 */
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const ESTILOS_POR_TIPO = {
  exito: { fondo: colors.primaryDark, icono: 'check-circle', colorIcono: colors.onlineDot },
  error: { fondo: colors.danger, icono: 'alert-circle', colorIcono: colors.white },
  info: { fondo: colors.textPrimary, icono: 'info', colorIcono: colors.white },
};

export default function Toast() {
  const { toast } = useApp();
  const insets = useSafeAreaInsets();
  // Animated.Value en estado (no en ref) para cumplir con las reglas de React 19.
  const [animacion] = useState(() => new Animated.Value(0));

  // Anima la entrada/salida del toast cada vez que cambia el mensaje.
  useEffect(() => {
    if (toast) {
      Animated.spring(animacion, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    } else {
      Animated.timing(animacion, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [toast, animacion]);

  if (!toast) return null;
  const estilo = ESTILOS_POR_TIPO[toast.tipo] ?? ESTILOS_POR_TIPO.info;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          backgroundColor: estilo.fondo,
          top: insets.top + spacing.md,
          opacity: animacion,
          transform: [
            {
              translateY: animacion.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }),
            },
          ],
        },
      ]}
    >
      <Feather name={estilo.icono} size={16} color={estilo.colorIcono} />
      <Text style={styles.texto}>{toast.mensaje}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    zIndex: 1000,
    ...shadows.button,
  },
  texto: {
    ...typography.captionBold,
    color: colors.white,
    flex: 1,
  },
});

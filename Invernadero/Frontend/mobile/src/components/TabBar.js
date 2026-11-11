/**
 * Barra de navegación inferior personalizada (5 pestañas):
 * Inicio, Planta, Riego, Historial y Más.
 * Fondo blanco, icono de línea y etiqueta; la pestaña activa en verde oscuro.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows, spacing, typography } from '../theme';

/** Iconos de cada pestaña (estilo de línea). */
const ICONOS = {
  Inicio: { familia: Feather, nombre: 'home' },
  // «leaf» (sólido) en lugar de «leaf-outline»: la variante outline no se
  // renderiza en algunos entornos (p. ej. Expo Go con Ionicons antiguo) y
  // muestra un «?» en su lugar.
  Planta: { familia: Ionicons, nombre: 'leaf' },
  Riego: { familia: Feather, nombre: 'droplet' },
  Historial: { familia: Feather, nombre: 'bar-chart-2' },
  Más: { familia: Feather, nombre: 'menu' },
};

const FAMILIAS = { Feather, Ionicons };

export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const activa = state.index === index;
        const icono = ICONOS[route.name] ?? { familia: Feather, nombre: 'circle' };
        const Familia = FAMILIAS[icono.familia] ?? Feather;

        const onPress = () => {
          // Respeta el protocolo de React Navigation (permite prevenir la navegación).
          const evento = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!activa && !evento.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={activa ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title ?? route.name}
            onPress={onPress}
            style={styles.tab}
          >
            <Familia name={icono.nombre} size={22} color={activa ? colors.primary : colors.textTertiary} />
            <Text style={[styles.etiqueta, activa && styles.etiquetaActiva]}>
              {options.title ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    ...shadows.tabBar,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  etiqueta: {
    ...typography.micro,
    color: colors.textTertiary,
  },
  etiquetaActiva: {
    color: colors.primary,
    fontWeight: '700',
  },
});

import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts } from '@/theme';

type Variante = 'negro' | 'gris' | 'blanco' | 'oscuro';

interface BotonProps {
  titulo: string;
  onPress?: () => void;
  variante?: Variante;
  cargando?: boolean;
  deshabilitado?: boolean;
  icono?: ReactNode;
  style?: StyleProp<ViewStyle>;
  texto?: StyleProp<TextStyle>;
}

const fondos: Record<Variante, string> = {
  negro: colors.black,
  oscuro: colors.primary,
  gris: colors.google,
  blanco: colors.white,
};

/** Botón principal: negro con texto blanco ("Continuar", "¡Registrar mascota!"). */
export function Boton({ titulo, onPress, variante = 'negro', cargando, deshabilitado, icono, style, texto }: BotonProps) {
  const claro = variante === 'gris' || variante === 'blanco';
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        styles.boton,
        { backgroundColor: fondos[variante] },
        variante === 'blanco' && styles.bordeado,
        (pressed || deshabilitado) && styles.presionado,
        style,
      ]}>
      {cargando ? (
        <ActivityIndicator color={claro ? colors.black : colors.white} />
      ) : (
        <View style={styles.fila}>
          {icono}
          <Text style={[styles.texto, { color: claro ? colors.black : colors.white }, texto]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Logotipo de Google de cuatro colores. */
export function LogoGoogle({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z"
      />
      <Path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.6H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.4l4.01-3.11z" />
      <Path
        fill="#EB4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.6l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </Svg>
  );
}

type FeatherName = ComponentProps<typeof Feather>['name'];

/** Botón cuadrado con icono (campana y engrane de inicio, "+" del dispensador, atrás). */
export function BotonIcono({
  icono,
  onPress,
  fondo = colors.white,
  color = colors.text,
  size = 44,
  radio = 14,
  borde = true,
  tamanoIcono = 22,
  insignia,
  etiqueta,
  style,
}: {
  icono: FeatherName;
  onPress?: () => void;
  fondo?: string;
  color?: string;
  size?: number | { w: number; h: number };
  radio?: number;
  borde?: boolean;
  tamanoIcono?: number;
  insignia?: number;
  etiqueta: string;
  style?: StyleProp<ViewStyle>;
}) {
  const w = typeof size === 'number' ? size : size.w;
  const h = typeof size === 'number' ? size : size.h;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.icono,
        { width: w, height: h, borderRadius: radio, backgroundColor: fondo },
        borde && styles.iconoBorde,
        pressed && styles.presionado,
        style,
      ]}>
      <Feather name={icono} size={tamanoIcono} color={color} />
      {insignia ? (
        <View style={styles.insignia}>
          <Text style={styles.insigniaTexto}>{insignia > 9 ? '9+' : insignia}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Botón circular de − / + con borde gris (Alimentar ahora, Porción por comida). */
export function BotonCircular({
  icono,
  onPress,
  size = 60,
  deshabilitado,
  etiqueta,
}: {
  icono: 'minus' | 'plus';
  onPress: () => void;
  size?: number;
  deshabilitado?: boolean;
  etiqueta: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        styles.circular,
        { width: size, height: size, borderRadius: size / 2 },
        (pressed || deshabilitado) && styles.presionado,
      ]}>
      <Feather name={icono} size={size * 0.4} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  bordeado: { borderWidth: 1, borderColor: colors.borderSoft },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  texto: { fontFamily: fonts.medium, fontSize: 14 },
  presionado: { opacity: 0.6 },
  icono: { alignItems: 'center', justifyContent: 'center' },
  iconoBorde: { borderWidth: 1, borderColor: colors.borderSoft },
  insignia: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 19,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insigniaTexto: { color: colors.white, fontFamily: fonts.semibold, fontSize: 10 },
  circular: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

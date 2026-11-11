import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

import { colors, fonts } from '@/theme';

/** Tarjeta blanca con borde sutil (radio 20 como en Dispensador / Alimentar ahora). */
export function Tarjeta({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.tarjeta, style]}>{children}</View>;
}

/** Interruptor negro de los mockups (perilla blanca). */
export function Interruptor({
  valor,
  onCambio,
  deshabilitado,
  etiqueta,
}: {
  valor: boolean;
  onCambio: (v: boolean) => void;
  deshabilitado?: boolean;
  etiqueta: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: valor, disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={() => onCambio(!valor)}
      hitSlop={8}
      style={[styles.switch, { backgroundColor: valor ? colors.text : '#A6A6A6' }, deshabilitado && { opacity: 0.5 }]}>
      <View style={[styles.perilla, valor ? styles.perillaOn : styles.perillaOff]} />
    </Pressable>
  );
}

/** Barra de progreso con pista gris. */
export function Barra({
  valor,
  color = colors.text,
  pista = colors.track,
  alto = 8,
  style,
}: {
  valor: number | null | undefined;
  color?: string;
  pista?: string;
  alto?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(100, valor ?? 0));
  return (
    <View style={[{ height: alto, borderRadius: alto / 2, backgroundColor: pista, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: alto / 2, backgroundColor: color }} />
    </View>
  );
}

/** Píldora de estado ("● Conectado"). */
export function Pildora({
  texto,
  fondo,
  color,
  punto = true,
  style,
  textoStyle,
}: {
  texto: string;
  fondo: string;
  color: string;
  punto?: boolean;
  style?: StyleProp<ViewStyle>;
  textoStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.pildora, { backgroundColor: fondo }, style]}>
      {punto ? <View style={[styles.punto, { backgroundColor: color }]} /> : null}
      <Text style={[styles.pildoraTexto, { color }, textoStyle]}>{texto}</Text>
    </View>
  );
}

/** Foto de la mascota o silueta de usuario cuando no hay foto (tarjeta de inicio). */
export function Avatar({ uri, size = 52, fondo = colors.homeCard }: { uri?: string; size?: number; fondo?: string }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: size * 0.075,
        borderColor: colors.homeAvatar,
        backgroundColor: fondo,
        alignItems: 'center',
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: size * 0.36,
          height: size * 0.36,
          borderRadius: size,
          backgroundColor: colors.homeAvatar,
          marginTop: size * 0.13,
        }}
      />
      <View
        style={{
          width: size * 0.7,
          height: size * 0.5,
          borderRadius: size,
          backgroundColor: colors.homeAvatar,
          marginTop: size * 0.06,
        }}
      />
    </View>
  );
}

export function Cargador({ color = colors.text }: { color?: string }) {
  return (
    <View style={styles.cargador}>
      <ActivityIndicator color={color} />
    </View>
  );
}

/** Mensaje vacío o de error con acción opcional. */
export function Aviso({
  icono = 'info',
  titulo,
  texto,
  accion,
  onAccion,
  oscuro,
}: {
  icono?: ComponentProps<typeof Feather>['name'];
  titulo: string;
  texto?: string;
  accion?: string;
  onAccion?: () => void;
  oscuro?: boolean;
}) {
  const color = oscuro ? colors.white : colors.text;
  return (
    <View style={styles.aviso}>
      <Feather name={icono} size={28} color={oscuro ? colors.camText : colors.muted} />
      <Text style={[styles.avisoTitulo, { color }]}>{titulo}</Text>
      {texto ? <Text style={[styles.avisoTexto, oscuro && { color: colors.camText }]}>{texto}</Text> : null}
      {accion && onAccion ? (
        <Pressable onPress={onAccion} style={styles.avisoBoton} accessibilityRole="button">
          <Text style={styles.avisoBotonTexto}>{accion}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function TextoError({ mensaje }: { mensaje?: string | null }) {
  if (!mensaje) return null;
  return <Text style={styles.error}>{mensaje}</Text>;
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 20,
  },
  switch: { width: 51, height: 31, borderRadius: 16, justifyContent: 'center', paddingHorizontal: 3 },
  perilla: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.white },
  perillaOn: { alignSelf: 'flex-end' },
  perillaOff: { alignSelf: 'flex-start' },
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    height: 26,
    borderRadius: 13,
  },
  punto: { width: 7, height: 7, borderRadius: 4 },
  pildoraTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 13 },
  cargador: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  aviso: { alignItems: 'center', padding: 24, gap: 8 },
  avisoTitulo: { fontFamily: fonts.jakartaBold, fontSize: 16, textAlign: 'center' },
  avisoTexto: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  avisoBoton: {
    marginTop: 8,
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  avisoBotonTexto: { color: colors.white, fontFamily: fonts.jakartaSemibold, fontSize: 14 },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
});

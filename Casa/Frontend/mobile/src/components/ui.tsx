import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tacto } from '@/lib/haptics';
import { colors, radius, t } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const nativo = Platform.OS !== 'web';

/** Resplandores de fondo (da profundidad sin imágenes). */
export function Aurora({ alarma = false }: { alarma?: boolean }) {
  const a = alarma ? 'rgba(255,77,94,0.20)' : 'rgba(200,255,61,0.11)';
  const b = alarma ? 'rgba(255,77,94,0.10)' : 'rgba(61,255,154,0.06)';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', top: -20, right: -30, width: 8, height: 8, borderRadius: 4, boxShadow: `0 0 170px 110px ${a}` }} />
      <View style={{ position: 'absolute', top: 460, left: -40, width: 8, height: 8, borderRadius: 4, boxShadow: `0 0 170px 90px ${b}` }} />
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  alarma = false,
  refresco,
}: {
  children: ReactNode;
  scroll?: boolean;
  alarma?: boolean;
  refresco?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: insets.bottom + 120 };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Aurora alarma={alarma} />
      {scroll ? (
        <ScrollView contentContainerStyle={pad} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
          {refresco}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{children}</View>
      )}
    </View>
  );
}

type Tono = 'normal' | 'lime' | 'danger' | 'amber';
const TONOS: Record<Tono, { bg: string; borde: string; sombra?: string }> = {
  normal: { bg: colors.card, borde: colors.line },
  lime: { bg: '#10150C', borde: colors.limeLine, sombra: '0 0 36px rgba(200,255,61,0.10)' },
  danger: { bg: '#1A0E10', borde: colors.redLine, sombra: '0 0 40px rgba(255,77,94,0.16)' },
  amber: { bg: '#18130B', borde: 'rgba(255,181,71,0.35)' },
};

export function Card({ children, tono = 'normal', style }: { children: ReactNode; tono?: Tono; style?: StyleProp<ViewStyle> }) {
  const c = TONOS[tono];
  return (
    <View
      style={[
        {
          backgroundColor: c.bg,
          borderColor: c.borde,
          borderWidth: 1,
          borderRadius: radius.l,
          padding: 18,
          marginBottom: 14,
          boxShadow: c.sombra,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[t.label, style]}>{children}</Text>;
}

export function Titulo({ kicker, children, derecha }: { kicker?: string; children: ReactNode; derecha?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
      <View style={{ flex: 1 }}>
        {kicker ? <Label style={{ color: colors.lime, marginBottom: 4 }}>{kicker}</Label> : null}
        <Text style={t.h1}>{children}</Text>
      </View>
      {derecha}
    </View>
  );
}

export function Seccion({ children, derecha }: { children: ReactNode; derecha?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 12 }}>
      <Label>{children}</Label>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.lineSoft }} />
      {derecha}
    </View>
  );
}

/** Punto que late (señal "en vivo"). */
export function Pulso({ color = colors.lime, size = 8 }: { color?: string; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: nativo }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: nativo }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ width: size * 2.4, height: size * 2.4, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 2.4,
          height: size * 2.4,
          borderRadius: size * 1.2,
          backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

export function Pill({ texto, color = colors.lime, pulso = false, icono }: { texto: string; color?: string; pulso?: boolean; icono?: IconName }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 5,
        paddingLeft: pulso ? 6 : 10,
        paddingRight: 11,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: 'rgba(255,255,255,0.03)',
      }}
    >
      {pulso ? <Pulso color={color} size={6} /> : icono ? <Ionicons name={icono} size={13} color={color} /> : null}
      <Text style={{ color, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.3 }}>{texto}</Text>
    </View>
  );
}

export function Burbuja({ icono, color = colors.lime, bg = colors.limeBg, size = 46 }: { icono: IconName; color?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icono} size={size * 0.48} color={color} />
    </View>
  );
}

type Variante = 'lime' | 'ghost' | 'danger' | 'soft';
export function Btn({
  title,
  onPress,
  variante = 'lime',
  icono,
  cargando,
  disabled,
  pequeno,
  style,
}: {
  title: string;
  onPress?: () => void;
  variante?: Variante;
  icono?: IconName;
  cargando?: boolean;
  disabled?: boolean;
  pequeno?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const estilos: Record<Variante, { bg: string; fg: string; borde: string; sombra?: string }> = {
    lime: { bg: colors.lime, fg: '#0A1200', borde: colors.lime, sombra: '0 6px 26px rgba(200,255,61,0.28)' },
    ghost: { bg: 'transparent', fg: colors.text, borde: colors.line },
    danger: { bg: colors.red, fg: '#2A0508', borde: colors.red },
    soft: { bg: colors.card2, fg: colors.text, borde: colors.line },
  };
  const e = estilos[variante];
  const inactivo = disabled || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactivo}
      onPress={() => {
        tacto.toque();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: pequeno ? 42 : 54,
          paddingHorizontal: pequeno ? 16 : 22,
          borderRadius: pequeno ? 14 : 18,
          backgroundColor: e.bg,
          borderWidth: 1,
          borderColor: e.borde,
          opacity: inactivo ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          boxShadow: inactivo ? undefined : e.sombra,
        },
        style,
      ]}
    >
      {cargando ? <ActivityIndicator color={e.fg} /> : icono ? <Ionicons name={icono} size={pequeno ? 16 : 19} color={e.fg} /> : null}
      <Text style={{ color: e.fg, fontSize: pequeno ? 14 : 16, fontWeight: '800', letterSpacing: -0.1 }}>{title}</Text>
    </Pressable>
  );
}

/** Interruptor con animación. */
export function Toggle({ valor, onCambio, deshabilitado, color = colors.lime }: { valor: boolean; onCambio: (v: boolean) => void; deshabilitado?: boolean; color?: string }) {
  const x = useRef(new Animated.Value(valor ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: valor ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [valor, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      disabled={deshabilitado}
      onPress={() => {
        tacto.toque();
        onCambio(!valor);
      }}
      hitSlop={8}
    >
      <Animated.View
        style={{
          width: 58,
          height: 34,
          borderRadius: 17,
          padding: 3,
          borderWidth: 1,
          borderColor: valor ? color : colors.line,
          backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: [colors.card2, 'rgba(200,255,61,0.16)'] }),
        }}
      >
        <Animated.View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: valor ? color : colors.dim,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }],
            boxShadow: valor ? `0 0 14px ${color}` : undefined,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

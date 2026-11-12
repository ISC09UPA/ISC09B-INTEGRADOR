import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts } from '@/theme';

/** Logotipo "Spencer" en Abel, como en los mockups. */
export function Logo({ size = 40, style }: { size?: number; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.logo, { fontSize: size, lineHeight: size * 1.2 }, style]}>Spencer</Text>;
}

/** Círculo morado de la marca (Landing, Log in y Sign in). */
export function MarcaCirculo({ size = 168 }: { size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brand }} />;
}

/** Indicador de carga circular de la Landing (arco morado sobre anillo lila). */
export function Cargando({ size = 92 }: { size?: number }) {
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(giro, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [giro]);

  const grosor = size * 0.1;
  const r = (size - grosor) / 2;
  const c = 2 * Math.PI * r;
  const rotate = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }} accessibilityLabel="Cargando">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.brandSoft}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${c * 0.68} ${c}`}
          fill="none"
          rotation={-80}
          origin={`${size / 2}, ${size / 2}`}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.brand}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${c * 0.16} ${c}`}
          fill="none"
          rotation={-5}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logo: { fontFamily: fonts.logo, color: colors.black, textAlign: 'center' },
});

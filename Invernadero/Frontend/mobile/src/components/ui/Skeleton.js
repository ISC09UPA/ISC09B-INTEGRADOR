/**
 * Skeleton: bloque gris con pulso de opacidad para los estados «Cargando».
 */
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme';

export default function Skeleton({ width = '100%', height = 16, radius = radii.md, style }) {
  // Animated.Value en estado (no en ref) para cumplir con las reglas de React 19.
  const [opacidad] = useState(() => new Animated.Value(0.45));

  // Pulso continuo mientras el skeleton esté visible.
  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [opacidad]);

  return (
    <Animated.View
      style={[
        styles.bloque,
        { width, height, borderRadius: radius, opacity: opacidad },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bloque: {
    backgroundColor: colors.surfaceMuted,
  },
});

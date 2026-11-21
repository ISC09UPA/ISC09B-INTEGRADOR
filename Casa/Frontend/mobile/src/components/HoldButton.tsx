import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';

import { tacto } from '@/lib/haptics';
import { colors } from '@/lib/theme';

/** Botón que hay que MANTENER pulsado para completarse (evita abrir la puerta por accidente). */
export function HoldButton({
  titulo,
  tituloListo,
  onCompleto,
  deshabilitado,
  ms = 900,
}: {
  titulo: string;
  tituloListo: string;
  onCompleto: () => void;
  deshabilitado?: boolean;
  ms?: number;
}) {
  const prog = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const [listo, setListo] = useState(false);

  const empezar = () => {
    if (deshabilitado) return;
    tacto.toque();
    anim.current = Animated.timing(prog, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (!finished) return;
      tacto.exito();
      setListo(true);
      onCompleto();
      setTimeout(() => {
        setListo(false);
        prog.setValue(0);
      }, 1400);
    });
  };

  const soltar = () => {
    anim.current?.stop();
    if (!listo) Animated.timing(prog, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  return (
    <Pressable onPressIn={empezar} onPressOut={soltar} disabled={deshabilitado} accessibilityRole="button" accessibilityHint="Mantén pulsado para completar">
      <View
        style={{
          height: 58,
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: deshabilitado ? colors.line : colors.limeLine,
          backgroundColor: colors.card2,
          justifyContent: 'center',
          opacity: deshabilitado && !listo ? 0.55 : 1,
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: colors.lime,
            width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Ionicons name={listo ? 'checkmark-circle' : 'finger-print'} size={22} color={listo ? '#0A1200' : colors.lime} />
          <Text style={{ color: listo ? '#0A1200' : colors.text, fontWeight: '800', fontSize: 15, letterSpacing: 0.4 }}>
            {listo ? tituloListo : titulo}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

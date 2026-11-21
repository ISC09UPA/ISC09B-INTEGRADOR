import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

export type ScannerHandle = { capturar: () => Promise<string> };
export type EstadoScan = 'idle' | 'scan' | 'ok' | 'fail';

const nativo = Platform.OS !== 'web';

type Props = {
  activo: boolean;
  estado: EstadoScan;
  ancho?: number;
  alto?: number;
  facing?: 'front' | 'back';
  onLista?: () => void;
  onError?: (mensaje: string) => void;
};

/** Visor de cámara con esquinas, línea de escaneo y colores según el resultado. */
export const FaceScanner = forwardRef<ScannerHandle, Props>(function FaceScanner(
  { activo, estado, ancho = 280, alto = 340, facing = 'front', onLista, onError },
  ref,
) {
  const cam = useRef<CameraView>(null);
  const lista = useRef(false);
  const linea = useRef(new Animated.Value(0)).current;
  const color = estado === 'fail' ? colors.red : estado === 'ok' ? colors.ok : colors.lime;

  useEffect(() => {
    if (!activo) lista.current = false;
  }, [activo]);

  useEffect(() => {
    if (!activo) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(linea, { toValue: 1, duration: estado === 'scan' ? 900 : 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: nativo }),
        Animated.timing(linea, { toValue: 0, duration: estado === 'scan' ? 900 : 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: nativo }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activo, estado, linea]);

  useImperativeHandle(
    ref,
    () => ({
      capturar: async () => {
        if (!lista.current || !cam.current) throw new Error('La cámara se está iniciando, espera un momento.');
        const foto = await cam.current.takePictureAsync({ base64: true, quality: 0.6 });
        // En web `base64` ya puede venir como data URL; en móvil viene solo el base64.
        let imagen: string | null = null;
        if (foto?.base64) {
          imagen = foto.base64.startsWith('data:') ? foto.base64 : `data:image/jpeg;base64,${foto.base64}`;
        } else if (foto?.uri?.startsWith('data:')) {
          imagen = foto.uri;
        }
        if (!imagen) throw new Error('No se pudo capturar la foto.');
        return imagen;
      },
    }),
    [],
  );

  const esq = (pos: object, bordes: object) => (
    <View style={[{ position: 'absolute', width: 38, height: 38, borderColor: color }, pos, bordes]} />
  );

  return (
    <View style={{ width: ancho, height: alto, alignSelf: 'center' }}>
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          margin: 10,
          borderRadius: 30,
          overflow: 'hidden',
          backgroundColor: '#0B0E10',
          borderWidth: 1,
          borderColor: colors.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {activo ? (
          <CameraView
            ref={cam}
            style={StyleSheet.absoluteFill}
            facing={facing}
            onCameraReady={() => {
              lista.current = true;
              onLista?.();
            }}
            onMountError={(e) => onError?.(`No se pudo abrir la cámara: ${e.message}`)}
          />
        ) : (
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Ionicons name="scan-outline" size={72} color={colors.dim} />
            <Text style={{ color: colors.dim, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>CÁMARA APAGADA</Text>
          </View>
        )}
        {activo && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: color,
              boxShadow: `0 0 18px 4px ${color}`,
              opacity: estado === 'ok' ? 0 : 0.9,
              transform: [{ translateY: linea.interpolate({ inputRange: [0, 1], outputRange: [10, alto - 30] }) }],
            }}
          />
        )}
        {estado === 'ok' && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(61,255,154,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark-circle" size={96} color={colors.ok} />
          </View>
        )}
      </View>
      {esq({ top: 0, left: 0, borderTopLeftRadius: 26 }, { borderTopWidth: 4, borderLeftWidth: 4 })}
      {esq({ top: 0, right: 0, borderTopRightRadius: 26 }, { borderTopWidth: 4, borderRightWidth: 4 })}
      {esq({ bottom: 0, left: 0, borderBottomLeftRadius: 26 }, { borderBottomWidth: 4, borderLeftWidth: 4 })}
      {esq({ bottom: 0, right: 0, borderBottomRightRadius: 26 }, { borderBottomWidth: 4, borderRightWidth: 4 })}
    </View>
  );
});

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { elegirFoto } from '@/components/PetForm';
import { colors, fonts } from '@/theme';

function Esquina({ posicion }: { posicion: 'ai' | 'ad' | 'bi' | 'bd' }) {
  const arriba = posicion[0] === 'a';
  const izquierda = posicion[1] === 'i';
  return (
    <View
      pointerEvents="none"
      style={[
        styles.esquina,
        arriba ? { top: 40, borderTopWidth: 3 } : { bottom: 40, borderBottomWidth: 3 },
        izquierda ? { left: 40, borderLeftWidth: 3 } : { right: 40, borderRightWidth: 3 },
        arriba && izquierda && { borderTopLeftRadius: 14 },
        arriba && !izquierda && { borderTopRightRadius: 14 },
        !arriba && izquierda && { borderBottomLeftRadius: 14 },
        !arriba && !izquierda && { borderBottomRightRadius: 14 },
      ]}
    />
  );
}

/**
 * Mockup "Camera" (Identificar mascota). Toma o elige una foto y abre el resultado.
 * Las identificaciones previas salen de GET /api/mascotas/{id}/visitas.
 */
export default function Camera() {
  const enfocada = useIsFocused();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const [lado, setLado] = useState<CameraType>('back');
  const [linterna, setLinterna] = useState(false);
  const [lista, setLista] = useState(false);
  const [capturando, setCapturando] = useState(false);

  const abrirResultado = (uri: string) => router.push({ pathname: '/resultado', params: { foto: uri } });

  const capturar = async () => {
    if (!camara.current || !lista) {
      if (!permiso?.granted) await pedirPermiso();
      return;
    }
    setCapturando(true);
    try {
      const foto = await camara.current.takePictureAsync({ quality: 0.7 });
      if (foto?.uri) abrirResultado(foto.uri);
    } finally {
      setCapturando(false);
    }
  };

  const galeria = async () => {
    const uri = await elegirFoto();
    if (uri) abrirResultado(uri);
  };

  const mostrarCamara = enfocada && !!permiso?.granted;

  return (
    <SafeAreaView style={styles.raiz} edges={['top']}>
      {enfocada ? <StatusBar style="light" /> : null}
      <View style={styles.cabecera}>
        <Pressable
          style={styles.redondo}
          onPress={() => router.navigate('/')}
          accessibilityRole="button"
          accessibilityLabel="Cerrar">
          <Feather name="x" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.titulo}>Identificar mascota</Text>
        <Pressable
          style={[styles.redondo, linterna && { backgroundColor: colors.white }]}
          onPress={() => setLinterna((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Linterna">
          <Feather name="zap" size={22} color={linterna ? colors.black : colors.white} />
        </Pressable>
      </View>

      <View style={styles.panel}>
        {mostrarCamara ? (
          <CameraView
            ref={camara}
            style={StyleSheet.absoluteFill}
            facing={lado}
            enableTorch={linterna}
            onCameraReady={() => setLista(true)}
          />
        ) : (
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="paw-outline" size={52} color={colors.camText} />
            <Text style={styles.vacioTexto}>Vista previa de la cámara</Text>
            {permiso && !permiso.granted ? (
              <Pressable onPress={pedirPermiso} style={styles.permiso} accessibilityRole="button">
                <Text style={styles.permisoTexto}>{permiso.canAskAgain ? 'Permitir cámara' : 'Activa la cámara en Ajustes'}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        <Esquina posicion="ai" />
        <Esquina posicion="ad" />
        <Esquina posicion="bi" />
        <Esquina posicion="bd" />
        <View style={styles.indicacion} pointerEvents="none">
          <Text style={styles.indicacionTexto}>Encuadra a tu mascota dentro del marco</Text>
        </View>
      </View>

      <View style={styles.controles}>
        <Pressable style={styles.cuadrado} onPress={galeria} accessibilityRole="button" accessibilityLabel="Elegir de la galería">
          <Feather name="image" size={22} color={colors.white} />
        </Pressable>
        <Pressable
          style={[styles.disparador, capturando && { opacity: 0.6 }]}
          onPress={capturar}
          disabled={capturando}
          accessibilityRole="button"
          accessibilityLabel="Tomar foto">
          <View style={styles.disparadorInterior} />
        </Pressable>
        <Pressable
          style={styles.cuadrado}
          onPress={() => setLado((l) => (l === 'back' ? 'front' : 'back'))}
          accessibilityRole="button"
          accessibilityLabel="Cambiar cámara">
          <Feather name="repeat" size={22} color={colors.white} />
        </Pressable>
      </View>

      <Pressable style={styles.previas} onPress={() => router.push('/identificaciones')} accessibilityRole="button">
        <Feather name="clock" size={18} color="#C8C8C8" />
        <Text style={styles.previasTexto}>Ver identificaciones previas</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.camBg },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 18,
  },
  redondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.camButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.white },
  panel: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 32,
    backgroundColor: colors.camPanel,
    overflow: 'hidden',
  },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  vacioTexto: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.camText },
  permiso: { marginTop: 8, backgroundColor: colors.camButton, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  permisoTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 13, color: colors.white },
  esquina: { position: 'absolute', width: 48, height: 48, borderColor: colors.white },
  indicacion: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(17,17,17,0.85)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  indicacionTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 12.5, color: colors.white },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 18,
  },
  cuadrado: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.camButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disparador: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disparadorInterior: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.white },
  previas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  previasTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: '#C8C8C8' },
});

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

import { BotonIcono } from './Buttons';

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Cabecera centrada con flecha y línea inferior (Registro y Perfil de mascota). */
export function CabeceraCentrada({ titulo, derecha }: { titulo: string; derecha?: ReactNode }) {
  return (
    <View style={styles.centrada}>
      <Pressable accessibilityRole="button" accessibilityLabel="Regresar" onPress={volver} hitSlop={12} style={styles.atras}>
        <Feather name="chevron-left" size={30} color={colors.black} />
      </Pressable>
      <Text style={styles.tituloCentrado} numberOfLines={1}>
        {titulo}
      </Text>
      <View style={styles.derecha}>{derecha}</View>
    </View>
  );
}

/** Cabecera con botón cuadrado blanco y título grande (Alimentar ahora, Resultado). */
export function CabeceraTitulo({
  titulo,
  derecha,
  atras = true,
}: {
  titulo: string;
  derecha?: ReactNode;
  atras?: boolean;
}) {
  return (
    <View style={styles.titulo}>
      {atras ? <BotonIcono icono="chevron-left" etiqueta="Regresar" onPress={volver} radio={14} tamanoIcono={22} /> : null}
      <Text style={styles.tituloGrande} numberOfLines={1}>
        {titulo}
      </Text>
      {derecha}
    </View>
  );
}

const styles = StyleSheet.create({
  centrada: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingHorizontal: 16,
  },
  atras: { width: 40, height: 40, justifyContent: 'center' },
  tituloCentrado: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.black,
  },
  derecha: { width: 40, alignItems: 'flex-end' },
  titulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tituloGrande: { flex: 1, fontFamily: fonts.jakartaBold, fontSize: 22, color: colors.text, letterSpacing: -0.4 },
});

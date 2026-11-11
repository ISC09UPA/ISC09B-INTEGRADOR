import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NivelActividad } from '@/api/types';
import { colors, fonts } from '@/theme';

import { Campo, Selector } from './Inputs';
import { Interruptor } from './Ui';

const iconoSubir = require('@/assets/images/icons/subir-foto.png');

/** Fila con etiqueta a la izquierda y control a la derecha, separada por línea (Registro de mascotas). */
export function FilaFormulario({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={styles.control}>{children}</View>
    </View>
  );
}

/** Fila de Peso y Edad con dos campos chicos. */
export function FilaPesoEdad({
  peso,
  edad,
  onPeso,
  onEdad,
  errorPeso,
  errorEdad,
  placeholderPeso = 'Kg...',
  placeholderEdad = 'años...',
}: {
  peso: string;
  edad: string;
  onPeso: (v: string) => void;
  onEdad: (v: string) => void;
  errorPeso?: string;
  errorEdad?: string;
  placeholderPeso?: string;
  placeholderEdad?: string;
}) {
  return (
    <View style={[styles.fila, styles.filaDoble]}>
      <View style={styles.mitad}>
        <Text style={styles.etiquetaChica}>Peso</Text>
        <Campo
          contenedor={{ flex: 1 }}
          style={styles.campoChico}
          placeholder={placeholderPeso}
          keyboardType="decimal-pad"
          value={peso}
          onChangeText={onPeso}
          error={errorPeso}
          accessibilityLabel="Peso en kilogramos"
        />
      </View>
      <View style={styles.mitad}>
        <Text style={styles.etiquetaChica}>Edad</Text>
        <Campo
          contenedor={{ flex: 1 }}
          style={styles.campoChico}
          placeholder={placeholderEdad}
          keyboardType="decimal-pad"
          value={edad}
          onChangeText={onEdad}
          error={errorEdad}
          accessibilityLabel="Edad en años"
        />
      </View>
    </View>
  );
}

export const OPCIONES_ACTIVIDAD: { valor: NivelActividad; etiqueta: string }[] = [
  { valor: 'Bajo', etiqueta: 'Baja · poco movimiento' },
  { valor: 'Moderado', etiqueta: 'Moderada · juego diario' },
  { valor: 'Alto', etiqueta: 'Alta · muy activo' },
];

export const OPCIONES_COMIDAS = ['1', '2', '3', '4', '5', '6'].map((n) => ({
  valor: n,
  etiqueta: n === '1' ? '1 comida al día' : `${n} comidas al día`,
}));

/** Campos que pide el backend para calcular la ración y no vienen en el mockup. */
export function CamposRacion({
  actividad,
  onActividad,
  esterilizado,
  onEsterilizado,
  comidas,
  onComidas,
}: {
  actividad: NivelActividad;
  onActividad: (v: NivelActividad) => void;
  esterilizado: boolean;
  onEsterilizado: (v: boolean) => void;
  comidas: number;
  onComidas: (v: number) => void;
}) {
  return (
    <>
      <FilaFormulario etiqueta="Actividad">
        <Selector titulo="Nivel de actividad" placeholder="Moderada" valor={actividad} opciones={OPCIONES_ACTIVIDAD} onCambio={onActividad} />
      </FilaFormulario>
      <FilaFormulario etiqueta="Comidas">
        <Selector
          titulo="Comidas por día"
          placeholder="2 comidas al día"
          valor={String(comidas)}
          opciones={OPCIONES_COMIDAS}
          onCambio={(v) => onComidas(Number(v))}
        />
      </FilaFormulario>
      <View style={[styles.fila, styles.filaSwitch]}>
        <Text style={styles.etiqueta}>Esterilizado</Text>
        <Interruptor valor={esterilizado} onCambio={onEsterilizado} etiqueta="Esterilizado" />
      </View>
    </>
  );
}

export async function elegirFoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  return res.canceled ? null : (res.assets[0]?.uri ?? null);
}

/** Bloque "Sube una foto de tu mascota" con el icono del mockup y el botón "Sube / Elige". */
export function SubirFoto({ uri, onCambio }: { uri?: string | null; onCambio: (uri: string) => void }) {
  const elegir = async () => {
    const nueva = await elegirFoto();
    if (nueva) onCambio(nueva);
  };
  return (
    <View style={styles.foto}>
      <Text style={styles.fotoTitulo}>Sube una foto de tu mascota</Text>
      <Pressable onPress={elegir} style={styles.fotoCaja} accessibilityRole="button" accessibilityLabel="Elegir foto">
        {uri ? (
          <Image source={{ uri }} style={styles.fotoImagen} contentFit="cover" />
        ) : (
          <Image source={iconoSubir} style={{ width: 154, height: 138 }} contentFit="contain" />
        )}
      </Pressable>
      <Pressable onPress={elegir} style={({ pressed }) => [styles.fotoBoton, pressed && { opacity: 0.7 }]} accessibilityRole="button">
        <Text style={styles.fotoBotonTexto}>Sube / Elige</Text>
      </Pressable>
      <Text style={styles.fotoAyuda}>
        Este es un paso importante para que el alimentador pueda reconocer a tu mascota, asegurate que se vea claramente
        su rostro...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 16,
  },
  filaDoble: { paddingHorizontal: 26, paddingVertical: 14, gap: 24 },
  filaSwitch: { justifyContent: 'space-between' },
  etiqueta: { width: 80, fontFamily: fonts.medium, fontSize: 12, color: colors.black },
  control: { flex: 1 },
  mitad: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  etiquetaChica: { fontFamily: fonts.medium, fontSize: 12, color: colors.black },
  campoChico: { height: 32 },
  foto: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, gap: 10 },
  fotoTitulo: { fontFamily: fonts.regular, fontSize: 14, color: colors.black },
  fotoCaja: {
    width: 196,
    height: 154,
    borderRadius: 24,
    backgroundColor: colors.homeCard,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fotoImagen: { width: '100%', height: '100%' },
  fotoBoton: { backgroundColor: '#2C2C2C', borderRadius: 8, paddingHorizontal: 12, height: 40, justifyContent: 'center' },
  fotoBotonTexto: { fontFamily: fonts.regular, fontSize: 16, color: '#F5F5F5' },
  fotoAyuda: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.black, alignSelf: 'stretch' },
});

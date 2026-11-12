import { Image } from 'expo-image';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { useAlimentador } from '@/context/AlimentadorContext';
import { colors, fonts } from '@/theme';

const iconoMascotas = require('@/assets/images/icons/mascotas.png');
const iconoDispensador = require('@/assets/images/icons/dispensador.png');
const iconoCamara = require('@/assets/images/icons/camara.png');

function IconoInicio() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 10.2 12 3.2l8.5 7V19.8a1.2 1.2 0 0 1-1.2 1.2H15.4v-5.6a3.4 3.4 0 0 0-6.8 0V21H4.7a1.2 1.2 0 0 1-1.2-1.2z"
        stroke={colors.black}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconoEstadisticas() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={2.5} width={19} height={19} rx={4} stroke={colors.black} strokeWidth={2} />
      <Path d="M8 17V10M12 17V7M16 17v-5" stroke={colors.black} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

const PESTANAS: Record<string, { etiqueta: string; icono: () => ReactNode }> = {
  index: { etiqueta: 'Inicio', icono: IconoInicio },
  mascotas: {
    etiqueta: 'Mascotas',
    icono: () => <Image source={iconoMascotas} style={{ width: 26, height: 25 }} contentFit="contain" />,
  },
  historial: { etiqueta: 'Estadísticas', icono: IconoEstadisticas },
  dispensador: {
    etiqueta: 'Dispensador',
    icono: () => <Image source={iconoDispensador} style={{ width: 17, height: 24 }} contentFit="contain" />,
  },
  camara: {
    etiqueta: 'Cámara',
    icono: () => <Image source={iconoCamara} style={{ width: 29, height: 23 }} contentFit="contain" />,
  },
};

/** Barra inferior de 5 pestañas solo con iconos; la activa lleva una píldora gris. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { noLeidas } = useAlimentador();

  return (
    <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((ruta, i) => {
        const config = PESTANAS[ruta.name];
        if (!config) return null;
        const activa = state.index === i;
        const Icono = config.icono;
        const insignia = ruta.name === 'dispensador' && noLeidas > 0 ? noLeidas : 0;

        return (
          <Pressable
            key={ruta.key}
            accessibilityRole="tab"
            accessibilityLabel={insignia ? `${config.etiqueta}, ${insignia} alertas` : config.etiqueta}
            accessibilityState={{ selected: activa }}
            onPress={() => {
              const evento = navigation.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
              if (!activa && !evento.defaultPrevented) navigation.navigate(ruta.name, ruta.params);
            }}
            style={styles.boton}>
            <View style={[styles.pildora, activa && styles.activa]}>
              <Icono />
              {insignia ? (
                <View style={styles.insignia}>
                  <Text style={styles.insigniaTexto}>{insignia > 9 ? '9+' : insignia}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  boton: { flex: 1, alignItems: 'center' },
  pildora: { width: 64, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  activa: { backgroundColor: colors.chip },
  insignia: {
    position: 'absolute',
    top: -2,
    left: 34,
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
  insigniaTexto: { color: colors.white, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 12 },
});

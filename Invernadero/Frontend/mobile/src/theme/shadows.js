import { Platform } from 'react-native';

/**
 * Sombras centralizadas.
 * En iOS se usan las propiedades shadow* y en Android elevation.
 * El color de sombra es un verde muy oscuro para integrarse con la paleta.
 */
function crearSombra({ opacidad, radio, desplazamientoY, elevacion }) {
  return Platform.select({
    ios: {
      shadowColor: '#16301F',
      shadowOpacity: opacidad,
      shadowRadius: radio,
      shadowOffset: { width: 0, height: desplazamientoY },
    },
    android: { elevation: elevacion },
    default: {
      shadowColor: '#16301F',
      shadowOpacity: opacidad,
      shadowRadius: radio,
      shadowOffset: { width: 0, height: desplazamientoY },
    },
  });
}

export const shadows = {
  card: crearSombra({ opacidad: 0.07, radio: 10, desplazamientoY: 3, elevacion: 3 }),
  button: crearSombra({ opacidad: 0.25, radio: 8, desplazamientoY: 4, elevacion: 4 }),
  tabBar: crearSombra({ opacidad: 0.1, radio: 12, desplazamientoY: -3, elevacion: 12 }),
  pill: crearSombra({ opacidad: 0.12, radio: 4, desplazamientoY: 1, elevacion: 2 }),
};

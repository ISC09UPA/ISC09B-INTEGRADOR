import { Alert, Platform } from 'react-native';

/** Confirmación que funciona en móvil y en web (Alert.alert con botones no hace nada en web). */
export function confirmar(opts: {
  titulo: string;
  mensaje: string;
  confirmarTexto: string;
  destructivo?: boolean;
  onConfirmar: () => void;
}) {
  const { titulo, mensaje, confirmarTexto, destructivo, onConfirmar } = opts;
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${titulo}\n\n${mensaje}`)) onConfirmar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmarTexto, style: destructivo ? 'destructive' : 'default', onPress: onConfirmar },
  ]);
}

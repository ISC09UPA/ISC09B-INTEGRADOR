// Funciones que se comportan igual en el celular y en el navegador
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const web = Platform.OS === 'web';
export const guardar = async (k, v) => (web ? localStorage.setItem(k, v) : SecureStore.setItemAsync(k, v));
export const leer = async (k) => (web ? localStorage.getItem(k) : SecureStore.getItemAsync(k));
export const borrar = async (k) => (web ? localStorage.removeItem(k) : SecureStore.deleteItemAsync(k));

export function avisar(titulo, msg) {
  if (web) window.alert(msg ? titulo + '\n' + msg : titulo);
  else Alert.alert(titulo, msg);
}

export function confirmar(titulo, msg, textoOk, onOk) {
  if (web) {
    if (window.confirm(titulo + '\n' + msg)) onOk();
    return;
  }
  Alert.alert(titulo, msg, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoOk, style: 'destructive', onPress: onOk },
  ]);
}

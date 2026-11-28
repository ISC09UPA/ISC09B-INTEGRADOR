/**
 * Servicio de autenticación.
 * Maneja inicio de sesión, registro, restauración y cierre de sesión.
 * La sesión se persiste de forma segura (SecureStore; localStorage en web).
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const CLAVE_SESION = 'invernadero.sesion';

/** Guarda la sesión en el almacén seguro del dispositivo. */
async function guardarSesion(sesion) {
  const valor = JSON.stringify(sesion);
  if (Platform.OS === 'web') {
    // SecureStore no existe en web; se usa localStorage como equivalente.
    localStorage.setItem(CLAVE_SESION, valor);
    return;
  }
  await SecureStore.setItemAsync(CLAVE_SESION, valor);
}

/** Elimina la sesión guardada (cierre de sesión). */
async function eliminarSesion() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(CLAVE_SESION);
    return;
  }
  await SecureStore.deleteItemAsync(CLAVE_SESION);
}

/** Inicia sesión con correo y contraseña; persiste la sesión. */
export async function iniciarSesion(email, contrasena) {
  const sesion = await api.post('/auth/login', { email, contrasena });
  await guardarSesion(sesion);
  return sesion;
}

/** Crea una cuenta nueva (correo + contraseña); responde con la sesión iniciada. */
export async function registrar({ email, contrasena }) {
  const sesion = await api.post('/auth/register', { email, contrasena });
  await guardarSesion(sesion);
  return sesion;
}

/** Restaura la sesión al abrir la app (o devuelve null si no existe). */
export async function restaurarSesion() {
  try {
    let valor = null;
    if (Platform.OS === 'web') {
      valor = localStorage.getItem(CLAVE_SESION);
    } else {
      valor = await SecureStore.getItemAsync(CLAVE_SESION);
    }
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

/** Cierra la sesión actual (borra el almacén local). */
export async function cerrarSesion() {
  await eliminarSesion();
  return true;
}

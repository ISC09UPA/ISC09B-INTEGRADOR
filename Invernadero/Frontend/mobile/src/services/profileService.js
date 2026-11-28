/**
 * Servicio de perfil y preferencias del usuario.
 */
import { api } from './api';

/** Obtiene el perfil del usuario (nombre, correo, rol). */
export function obtenerPerfil() {
  return api.get('/profile');
}

/** Actualiza los datos personales (nombre, correo, contraseña). */
export function actualizarPerfil(datos) {
  return api.patch('/profile', datos);
}

/** Obtiene las preferencias (unidades, idioma, tema). */
export function obtenerPreferencias() {
  return api.get('/preferences');
}

/** Actualiza las preferencias. */
export function actualizarPreferencias(datos) {
  return api.patch('/preferences', datos);
}

/** Obtiene la configuración de notificaciones. */
export function obtenerNotificaciones() {
  return api.get('/notifications');
}

/** Actualiza la configuración de notificaciones. */
export function actualizarNotificaciones(datos) {
  return api.patch('/notifications', datos);
}

/** Obtiene el contenido de la guía de soporte. */
export function obtenerGuia() {
  return api.get('/guide');
}

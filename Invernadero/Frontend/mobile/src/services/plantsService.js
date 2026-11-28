/**
 * Servicio de plantas: listado, creación y selección de la planta activa.
 */
import { api } from './api';

/** Lista las plantas registradas y la planta activa actual. */
export function listarPlantas() {
  return api.get('/plants');
}

/** Crea una nueva planta asociada a un dispositivo. */
export function crearPlanta({ nombre, especie, dispositivoId }) {
  return api.post('/plants', { nombre, especie, dispositivoId });
}

/** Define la planta activa (la que se muestra en la pestaña Planta). */
export function activarPlanta(id) {
  return api.patch('/plants/active', { id });
}

/** Obtiene el dispositivo Raspberry Pi vinculado. */
export function obtenerDispositivo() {
  return api.get('/device');
}

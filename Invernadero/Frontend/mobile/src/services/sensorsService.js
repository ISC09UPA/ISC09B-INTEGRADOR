/**
 * Servicio de sensores: lecturas actuales e historial por periodo.
 */
import { api } from './api';

/** Obtiene las lecturas actuales de los cuatro sensores. */
export function obtenerLecturas() {
  return api.get('/sensors/readings');
}

/** Obtiene la serie histórica de un periodo: '24h' | '7d' | '30d'. */
export function obtenerHistorial(periodo) {
  return api.get('/sensors/history', { periodo });
}

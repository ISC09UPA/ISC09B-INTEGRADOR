/**
 * Servicio de alertas: listado y marcado como leídas.
 */
import { api } from './api';

/** Obtiene todas las alertas (leídas y sin leer). */
export function listarAlertas() {
  return api.get('/alerts');
}

/** Marca todas las alertas como leídas. */
export function marcarTodasLeidas() {
  return api.post('/alerts/read-all');
}

/**
 * Servicio de riego: estado de la bomba, configuración automática,
 * riego manual y estadísticas/historial de eventos.
 */
import { api } from './api';

/** Obtiene el estado completo del riego (bomba + configuración). */
export function obtenerEstado() {
  return api.get('/watering/state');
}

/** Activa o desactiva el riego automático por humedad. */
export function alternarAutomatico(automatico) {
  return api.patch('/watering/auto', { automatico });
}

/** Actualiza el umbral de humedad del riego automático (25 %–75 %). */
export function ajustarUmbral(umbral) {
  return api.patch('/watering/threshold', { umbral });
}

/** Envía la orden de riego manual con la duración elegida (segundos). */
export function iniciarRiego(segundos) {
  return api.post('/watering/start', { segundos });
}

/** Detiene la bomba (solo visible en estado «Regando…»). */
export function detenerRiego() {
  return api.post('/watering/stop');
}

/** Obtiene los eventos de riego del mes indicado (1-12). */
export function obtenerEventos(mes) {
  return api.get('/watering/events', { mes });
}

/** Obtiene el consumo semanal de agua con su variación. */
export function obtenerConsumo() {
  return api.get('/watering/consumption');
}

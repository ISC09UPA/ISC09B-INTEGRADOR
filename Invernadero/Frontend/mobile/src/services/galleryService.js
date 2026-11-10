/**
 * Servicio de galería: fotos de seguimiento del cultivo.
 */
import { api } from './api';

/** Obtiene las fotos de la galería y la foto más reciente de la planta. */
export function listarFotos() {
  return api.get('/gallery');
}

/** Registra una nueva foto (cámara del invernadero o del teléfono). */
export function agregarFoto() {
  return api.post('/gallery/photo');
}

/** Elimina una foto de la galería. */
export function eliminarFoto(id) {
  return api.post('/gallery/remove', { id });
}

import { deleteItem, getJson, setJson } from '@/storage/secure';

import type { AuthResponse } from './types';

const CLAVE = 'alimentador.sesion';

export interface Sesion {
  usuarioId: number;
  nombre: string;
  accessToken: string;
  expiraEn: string;
  refreshToken: string;
}

// Copia en memoria para no leer el almacenamiento seguro en cada petición.
let actual: Sesion | null = null;
let cargada = false;

export async function cargarSesion(): Promise<Sesion | null> {
  if (!cargada) {
    actual = await getJson<Sesion>(CLAVE);
    cargada = true;
  }
  return actual;
}

export function sesionActual(): Sesion | null {
  return actual;
}

export async function guardarSesion(auth: AuthResponse): Promise<Sesion> {
  actual = {
    usuarioId: auth.usuarioId,
    nombre: auth.nombre,
    accessToken: auth.accessToken,
    expiraEn: auth.expiraEn,
    refreshToken: auth.refreshToken,
  };
  cargada = true;
  await setJson(CLAVE, actual);
  return actual;
}

export async function borrarSesion(): Promise<void> {
  actual = null;
  cargada = true;
  await deleteItem(CLAVE);
}

/** true si el access token vence en menos de `margenMs`. */
export function tokenPorVencer(sesion: Sesion, margenMs = 30_000): boolean {
  const vence = Date.parse(sesion.expiraEn);
  return Number.isFinite(vence) && vence - Date.now() < margenMs;
}

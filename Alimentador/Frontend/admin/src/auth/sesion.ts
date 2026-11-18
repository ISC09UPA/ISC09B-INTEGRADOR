import type { AuthResponse } from '../api/types';

/**
 * Sesión guardada en sessionStorage (ver README: se borra al cerrar la pestaña y no se comparte
 * entre pestañas, lo que reduce el tiempo de exposición de los tokens de una cuenta con privilegios).
 */
export interface Sesion {
  usuarioId: number;
  nombre: string;
  accessToken: string;
  refreshToken: string;
  expiraEn: string;
  esAdministrador: boolean;
}

const CLAVE = 'alimentador.admin.sesion';

type Oyente = (sesion: Sesion | null, motivo?: MotivoCierre) => void;

/** Por qué se cerró la sesión sin que el usuario lo pidiera. */
export type MotivoCierre = 'expirada' | 'sinPermiso';

const oyentes = new Set<Oyente>();
let actual: Sesion | null = leer();

function leer(): Sesion | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
}

export function obtenerSesion(): Sesion | null {
  return actual;
}

export function sesionDesdeAuth(r: AuthResponse): Sesion {
  return {
    usuarioId: r.usuarioId,
    nombre: r.nombre,
    accessToken: r.accessToken,
    refreshToken: r.refreshToken,
    expiraEn: r.expiraEn,
    esAdministrador: r.esAdministrador,
  };
}

export function guardarSesion(sesion: Sesion): void {
  actual = sesion;
  sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
  oyentes.forEach((o) => o(sesion));
}

export function borrarSesion(motivo?: MotivoCierre): void {
  actual = null;
  sessionStorage.removeItem(CLAVE);
  oyentes.forEach((o) => o(null, motivo));
}

export function suscribirSesion(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

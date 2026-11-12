import type { TipoAlerta } from '@/api/types';

import { getJson, setJson } from './secure';

/**
 * Datos que el backend todavía no guarda y que la app conserva en el teléfono:
 * raza y foto de cada mascota, y qué grupos de alertas quiere ver el usuario.
 */
export interface ExtrasMascota {
  raza?: string;
  fotoUri?: string;
}

const CLAVE_EXTRAS = 'alimentador.mascotas.extras';
const CLAVE_ALERTAS = 'alimentador.preferencias.alertas';
const CLAVE_SELECCION = 'alimentador.seleccion';

export async function leerExtras(): Promise<Record<string, ExtrasMascota>> {
  return (await getJson<Record<string, ExtrasMascota>>(CLAVE_EXTRAS)) ?? {};
}

export async function guardarExtras(mascotaId: number, extras: ExtrasMascota): Promise<Record<string, ExtrasMascota>> {
  const todos = await leerExtras();
  todos[mascotaId] = { ...todos[mascotaId], ...extras };
  await setJson(CLAVE_EXTRAS, todos);
  return todos;
}

export interface PreferenciasAlertas {
  pocoAlimento: boolean;
  atasco: boolean;
  desconexion: boolean;
}

export const PREFERENCIAS_ALERTAS_INICIALES: PreferenciasAlertas = {
  pocoAlimento: true,
  atasco: true,
  desconexion: true,
};

export async function leerPreferenciasAlertas(): Promise<PreferenciasAlertas> {
  return { ...PREFERENCIAS_ALERTAS_INICIALES, ...(await getJson<Partial<PreferenciasAlertas>>(CLAVE_ALERTAS)) };
}

export function guardarPreferenciasAlertas(p: PreferenciasAlertas): Promise<void> {
  return setJson(CLAVE_ALERTAS, p);
}

/** Si el tipo de alerta pertenece a un grupo que el usuario apagó, no se muestra ni cuenta. */
export function alertaVisible(tipo: TipoAlerta, p: PreferenciasAlertas): boolean {
  switch (tipo) {
    case 'TolvaBaja':
      return p.pocoAlimento;
    case 'Atasco':
      return p.atasco;
    case 'AlimentadorSinConexion':
    case 'GatewaySinConexion':
    case 'ConexionRestablecida':
      return p.desconexion;
    default:
      return true;
  }
}

export interface Seleccion {
  alimentadorId?: number;
  mascotaId?: number;
}

export async function leerSeleccion(): Promise<Seleccion> {
  return (await getJson<Seleccion>(CLAVE_SELECCION)) ?? {};
}

export function guardarSeleccion(s: Seleccion): Promise<void> {
  return setJson(CLAVE_SELECCION, s);
}

import { borrarSesion, cargarSesion, guardarSesion, sesionActual, tokenPorVencer, type Sesion } from './tokens';
import type { AuthResponse, ProblemDetails } from './types';

/** URL base del backend, configurable con EXPO_PUBLIC_API_URL (ver .env.example). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5126').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly problema: ProblemDetails | null;

  constructor(status: number, mensaje: string, problema: ProblemDetails | null = null) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.problema = problema;
  }

  /** Primer mensaje de validación de un campo, si el backend lo mandó. */
  campo(nombre: string): string | undefined {
    const errores = this.problema?.errors;
    if (!errores) return undefined;
    const clave = Object.keys(errores).find((k) => k.toLowerCase() === nombre.toLowerCase());
    return clave ? errores[clave]?.[0] : undefined;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface Opciones {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** false para login, registro y refresh. */
  auth?: boolean;
  signal?: AbortSignal;
}

// Avisos al contexto de sesión cuando el refresh falla y hay que volver al login.
const oyentesExpiracion = new Set<() => void>();
export function alExpirarSesion(fn: () => void): () => void {
  oyentesExpiracion.add(fn);
  return () => oyentesExpiracion.delete(fn);
}

function construirUrl(ruta: string, query?: Query): string {
  const url = `${API_URL}${ruta}`;
  if (!query) return url;
  const partes = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `${url}?${partes.join('&')}` : url;
}

async function leerError(res: Response): Promise<ApiError> {
  let problema: ProblemDetails | null = null;
  let texto = '';
  try {
    texto = await res.text();
    const json = texto ? JSON.parse(texto) : null;
    if (json && typeof json === 'object') problema = json as ProblemDetails;
    else if (typeof json === 'string') texto = json;
  } catch {
    // El cuerpo no era JSON; se usa el texto tal cual.
  }
  const primerCampo = problema?.errors ? Object.values(problema.errors)[0]?.[0] : undefined;
  const mensaje =
    primerCampo ??
    problema?.detail ??
    problema?.title ??
    (texto || (res.status === 401 ? 'Tu sesión expiró. Inicia sesión de nuevo.' : `Error ${res.status}`));
  return new ApiError(res.status, mensaje, problema);
}

// Una sola renovación a la vez: si varias peticiones reciben 401 juntas, todas esperan la misma.
let renovando: Promise<Sesion | null> | null = null;

export function renovarSesion(): Promise<Sesion | null> {
  if (!renovando) {
    renovando = (async () => {
      const sesion = sesionActual() ?? (await cargarSesion());
      if (!sesion) return null;
      try {
        const res = await fetch(construirUrl('/api/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken: sesion.refreshToken }),
        });
        if (!res.ok) {
          // Solo un rechazo explícito invalida la sesión; un fallo de red no.
          if (res.status === 400 || res.status === 401 || res.status === 403) {
            await borrarSesion();
            oyentesExpiracion.forEach((fn) => fn());
          }
          return null;
        }
        return await guardarSesion((await res.json()) as AuthResponse);
      } catch {
        return null;
      }
    })().finally(() => {
      renovando = null;
    });
  }
  return renovando;
}

/** Token vigente para SignalR; lo renueva si está por vencer. */
export async function obtenerAccessToken(): Promise<string> {
  let sesion = sesionActual() ?? (await cargarSesion());
  if (sesion && tokenPorVencer(sesion)) sesion = (await renovarSesion()) ?? sesion;
  return sesion?.accessToken ?? '';
}

export async function request<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = opciones;

  const enviar = async (token: string | null) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      return await fetch(construirUrl(ruta, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw e;
      throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión.');
    }
  };

  let token: string | null = null;
  if (auth) {
    let sesion = sesionActual() ?? (await cargarSesion());
    if (sesion && tokenPorVencer(sesion)) sesion = (await renovarSesion()) ?? sesion;
    token = sesion?.accessToken ?? null;
  }

  let res = await enviar(token);

  // Interceptor: con 401 se renueva el token una vez y se repite la petición.
  if (res.status === 401 && auth) {
    const nueva = await renovarSesion();
    if (nueva) res = await enviar(nueva.accessToken);
  }

  if (!res.ok) throw await leerError(res);
  if (res.status === 204) return undefined as T;

  const texto = await res.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

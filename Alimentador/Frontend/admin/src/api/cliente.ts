import { borrarSesion, guardarSesion, obtenerSesion, sesionDesdeAuth } from '../auth/sesion';
import type { AuthResponse, ProblemDetails } from './types';

/** URL base del backend. En modo demo queda vacía y las rutas son del mismo origen. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const MODO_DEMO = import.meta.env.VITE_DEMO === '1';

/** Error de la API con el ProblemDetails del backend cuando lo hay. */
export class ApiError extends Error {
  readonly status: number;
  readonly problema: ProblemDetails | null;

  constructor(status: number, problema: ProblemDetails | null, mensaje: string) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.problema = problema;
  }
}

/** Mensaje legible para mostrar al usuario a partir de cualquier error. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    const errores = error.problema?.errors;
    if (errores) {
      const primeros = Object.values(errores).flat().slice(0, 3);
      if (primeros.length > 0) return `${error.message} ${primeros.join(' ')}`;
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (error instanceof Error && error.name === 'AbortError') return 'Se canceló la operación.';
  return 'Ocurrió un error inesperado.';
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  400: 'La solicitud no es válida.',
  401: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No se encontró lo que buscas.',
  409: 'La operación entra en conflicto con el estado actual.',
  413: 'El archivo es demasiado grande.',
  500: 'Ocurrió un error en el servidor.',
};

async function errorDesdeRespuesta(r: Response): Promise<ApiError> {
  let problema: ProblemDetails | null = null;
  try {
    const texto = await r.text();
    if (texto) problema = JSON.parse(texto) as ProblemDetails;
  } catch {
    problema = null;
  }
  const mensaje =
    problema?.detail || problema?.title || MENSAJES_POR_ESTADO[r.status] || `Error ${r.status}.`;
  return new ApiError(r.status, problema, mensaje);
}

// ---------- Renovación del access token ----------

/** Una sola renovación en vuelo aunque varias peticiones reciban 401 a la vez. */
let renovacionEnCurso: Promise<boolean> | null = null;

/** Margen para renovar antes de que venza el token y evitar un 401 seguro. */
const MARGEN_EXPIRACION_MS = 30_000;

function renovarSesion(): Promise<boolean> {
  if (renovacionEnCurso) return renovacionEnCurso;
  const sesion = obtenerSesion();
  if (!sesion) return Promise.resolve(false);

  renovacionEnCurso = (async () => {
    try {
      const r = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: sesion.refreshToken }),
      });
      if (!r.ok) return false;
      const datos = (await r.json()) as AuthResponse;
      if (!datos.esAdministrador) {
        borrarSesion('sinPermiso');
        return false;
      }
      guardarSesion(sesionDesdeAuth(datos));
      return true;
    } catch {
      // Sin red no se cierra la sesión: el refresh token sigue siendo válido.
      throw new TypeError('Sin conexión');
    } finally {
      renovacionEnCurso = null;
    }
  })();
  return renovacionEnCurso;
}

function tokenPorVencer(): boolean {
  const sesion = obtenerSesion();
  if (!sesion) return false;
  return new Date(sesion.expiraEn).getTime() - Date.now() < MARGEN_EXPIRACION_MS;
}

function encabezadosAuth(): Record<string, string> {
  const sesion = obtenerSesion();
  return sesion ? { Authorization: `Bearer ${sesion.accessToken}` } : {};
}

/**
 * Obtiene un access token vigente (renovándolo si está por vencer) y ejecuta `enviar`.
 * Ante 401 renueva una sola vez y reintenta; si la renovación falla, cierra la sesión.
 */
async function conAutenticacion<T>(
  enviar: (encabezados: Record<string, string>) => Promise<T>,
  esNoAutorizado: (resultado: T) => boolean,
): Promise<T> {
  if (tokenPorVencer()) {
    const ok = await renovarSesion();
    if (!ok) {
      if (obtenerSesion()) borrarSesion('expirada');
      throw new ApiError(401, null, MENSAJES_POR_ESTADO[401]!);
    }
  }
  const tokenUsado = obtenerSesion()?.accessToken;
  const primero = await enviar(encabezadosAuth());
  if (!esNoAutorizado(primero) || !obtenerSesion()) return primero;

  // Otra petición pudo haber renovado mientras tanto; si no, renovamos aquí.
  const yaRenovado = obtenerSesion()?.accessToken !== tokenUsado;
  const ok = yaRenovado || (await renovarSesion());
  if (!ok) {
    if (obtenerSesion()) borrarSesion('expirada');
    return primero;
  }
  return enviar(encabezadosAuth());
}

export interface OpcionesPeticion {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  /** Si es false no agrega Authorization ni intenta renovar (login, refresh). */
  autenticada?: boolean;
}

export function construirUrl(ruta: string, query?: OpcionesPeticion['query']): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
  }
  const qs = params.toString();
  return `${API_URL}${ruta}${qs ? `?${qs}` : ''}`;
}

/** Petición JSON contra el backend. Lanza ApiError con el `detail` de ProblemDetails. */
export async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { method = 'GET', body, query, signal, autenticada = true } = opciones;
  const url = construirUrl(ruta, query);

  const enviar = (auth: Record<string, string>) =>
    fetch(url, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(autenticada ? auth : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  const r = autenticada
    ? await conAutenticacion(enviar, (res) => res.status === 401)
    : await enviar({});

  if (!r.ok) {
    const error = await errorDesdeRespuesta(r);
    if (autenticada && r.status === 403 && ruta.startsWith('/api/admin/')) {
      // El rol se valida en cada petición: si nos lo quitaron, salimos del panel.
      borrarSesion('sinPermiso');
    }
    throw error;
  }
  if (r.status === 204) return undefined as T;
  const texto = await r.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

export interface Subida<T> {
  promesa: Promise<T>;
  cancelar: () => void;
}

/**
 * Subida multipart con progreso. `fetch` no expone el progreso de subida, así que se usa
 * XMLHttpRequest con la misma lógica de autenticación y renovación.
 */
export function subirFormulario<T>(
  ruta: string,
  datos: FormData,
  alProgresar: (fraccion: number) => void,
): Subida<T> {
  let xhrActual: XMLHttpRequest | null = null;
  let cancelado = false;

  const enviar = (auth: Record<string, string>) =>
    new Promise<{ status: number; texto: string }>((resolve, reject) => {
      if (cancelado) {
        reject(new DOMException('Cancelado', 'AbortError'));
        return;
      }
      const xhr = new XMLHttpRequest();
      xhrActual = xhr;
      xhr.open('POST', `${API_URL}${ruta}`);
      xhr.setRequestHeader('Accept', 'application/json');
      for (const [k, v] of Object.entries(auth)) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) alProgresar(e.loaded / e.total);
      };
      xhr.onload = () => resolve({ status: xhr.status, texto: xhr.responseText });
      xhr.onerror = () => reject(new TypeError('Sin conexión'));
      xhr.onabort = () => reject(new DOMException('Cancelado', 'AbortError'));
      xhr.send(datos);
    });

  const promesa = (async () => {
    const r = await conAutenticacion(enviar, (res) => res.status === 401);
    if (r.status < 200 || r.status >= 300) {
      throw await errorDesdeRespuesta(new Response(r.texto || null, { status: r.status }));
    }
    alProgresar(1);
    return (r.texto ? JSON.parse(r.texto) : undefined) as T;
  })();

  return {
    promesa,
    cancelar: () => {
      cancelado = true;
      xhrActual?.abort();
    },
  };
}

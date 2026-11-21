/** Cliente HTTP del backend CasaLink (token JWT, tiempos de espera y mensajes en español). */

let baseUrl = '';
let token: string | null = null;
let alExpirar: (() => void) | null = null;

export function configureApi(o: { baseUrl?: string; token?: string | null; alExpirar?: (() => void) | null }) {
  if (o.baseUrl !== undefined) baseUrl = o.baseUrl.replace(/\/+$/, '');
  if (o.token !== undefined) token = o.token;
  if (o.alExpirar !== undefined) alExpirar = o.alExpirar;
}

export function urlBase() {
  return baseUrl;
}

export function tokenActual() {
  return token;
}

export class ApiError extends Error {
  status: number;
  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.status = status;
  }
}

function mensajePorStatus(status: number): string {
  if (status === 401) return 'Tu sesión expiró. Inicia sesión otra vez.';
  if (status === 404) return 'El servidor no tiene esa función. ¿Está actualizado el backend?';
  if (status >= 500) return 'El servidor tuvo un problema. Revisa la ventana del backend.';
  return `El servidor respondió con error ${status}.`;
}

async function pedir<T>(method: string, path: string, body?: unknown, espera = 12000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), espera);
  try {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });

    const texto = await res.text();
    let data: unknown = null;
    try {
      data = texto ? JSON.parse(texto) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      if (res.status === 401 && token && !path.startsWith('/api/login')) alExpirar?.();
      const msg = (data as { mensaje?: string } | null)?.mensaje;
      throw new ApiError(msg ?? mensajePorStatus(res.status), res.status);
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError('El servidor tardó demasiado en responder.', 0);
    }
    throw new ApiError('No se pudo conectar con la casa. Revisa la dirección del servidor y el Wi-Fi.', 0);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, espera?: number) => pedir<T>('GET', path, undefined, espera),
  post: <T>(path: string, body?: unknown, espera?: number) => pedir<T>('POST', path, body ?? {}, espera),
  del: <T>(path: string) => pedir<T>('DELETE', path),
};

export function mensajeDe(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo salió mal.';
}

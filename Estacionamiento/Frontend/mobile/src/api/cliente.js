// Cliente HTTP de la API del backend (EstacionamientoInteligente.API).
// Todas las pantallas usan las funciones de ./index.js, que pasan por aquí.

// Dirección de la API. Se puede cambiar sin tocar código con la variable
// EXPO_PUBLIC_API_URL (por ejemplo en un archivo .env):
//   - Emulador de Android:  http://10.0.2.2:5141
//   - Celular físico:       http://<IP de la compu en la red>:5141
//   - Navegador / iOS sim:  http://localhost:5141
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5141').replace(/\/$/, '');

// El token del login vive en memoria mientras la app está abierta.
// Pendiente: guardarlo con expo-secure-store para no pedir login cada vez.
let token = null;

export function guardarToken(nuevo) {
  token = nuevo;
}

export function borrarToken() {
  token = null;
}

/** Error de la API con el código HTTP y el mensaje que mandó el back (ProblemDetails.detail). */
export class ErrorApi extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const MENSAJES_POR_CODIGO = {
  401: 'Tu sesión no es válida. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No se encontró lo que buscas.',
  500: 'Ocurrió un error en el servidor. Intenta de nuevo.',
};

/**
 * Hace la petición y regresa el JSON (o null si la respuesta no trae cuerpo, como 204).
 * Si el back responde con error, lanza ErrorApi con el mensaje de "detail".
 */
export async function pedir(metodo, ruta, { cuerpo, formulario, query } = {}) {
  // Se arma a mano: en React Native URL.searchParams no está implementado.
  const parametros = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = API_URL + ruta + (parametros ? `?${parametros}` : '');

  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let body;
  if (formulario) {
    body = formulario; // FormData: el Content-Type (con boundary) lo pone fetch solo.
  } else if (cuerpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(url, { method: metodo, headers, body });
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Revisa tu conexión.');
  }

  const texto = await respuesta.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = null; // Respuesta que no es JSON (por ejemplo, un error del servidor en HTML).
  }

  if (!respuesta.ok) {
    const mensaje =
      datos?.detail ??
      primerErrorDeValidacion(datos) ??
      MENSAJES_POR_CODIGO[respuesta.status] ??
      'Algo salió mal. Intenta de nuevo.';
    throw new ErrorApi(respuesta.status, mensaje);
  }

  return datos;
}

// Los errores de [Required], [EmailAddress], etc. llegan como { errors: { Campo: ["mensaje"] } }.
function primerErrorDeValidacion(datos) {
  const errores = datos?.errors;
  if (!errores) return null;
  const primero = Object.values(errores)[0];
  return Array.isArray(primero) ? primero[0] : null;
}

// Conexión en vivo con el back (SignalR, hub /hubs/estacionamiento).
// Se abre al iniciar sesión (App.js → conectarEnVivo) y se cierra al salir.
// Las pantallas no la usan directo: le pasan `enVivo: [...]` a useCarga y se recargan solas.
//
// Eventos que manda el back:
//   CajonActualizado  { numero, estado, libres, total }   → todos
//   PlumaActualizada  { abierta, fecha }                  → todos
//   AccesoRegistrado  { tipo, placa, cajon, hora }        → admins y el dueño del auto
//   AlertaCreada      AlertaDto                           → solo admins
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { API_URL } from './cliente';

export const EVENTOS = {
  cajon: 'CajonActualizado',
  pluma: 'PlumaActualizada',
  acceso: 'AccesoRegistrado',
  alerta: 'AlertaCreada',
};

// Evento propio (no viene del back): la conexión se recuperó después de caerse.
// Mientras estuvo caída pudieron perderse avisos, así que las pantallas recargan todo.
export const RECONECTADO = 'Reconectado';

const REINTENTO_INICIAL_MS = 5000;

let conexion = null;
let reintento = null;
const oyentes = new Map(); // evento → Set de funciones

function avisar(evento, datos) {
  oyentes.get(evento)?.forEach((fn) => fn(datos));
}

/** Abre la conexión con el token del login. Si el back no responde, reintenta cada 5 s. */
export function conectarEnVivo(token) {
  desconectarEnVivo();

  const nueva = new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/estacionamiento`, { accessTokenFactory: () => token })
    .withAutomaticReconnect() // si se cae: reintenta a los 0, 2, 10 y 30 s
    .configureLogging(LogLevel.Warning)
    .build();

  Object.values(EVENTOS).forEach((evento) => nueva.on(evento, (datos) => avisar(evento, datos)));
  nueva.onreconnected(() => avisar(RECONECTADO));
  // Si withAutomaticReconnect se rinde, se vuelve a empezar desde cero.
  nueva.onclose(() => {
    if (conexion === nueva) programarInicio(nueva);
  });

  conexion = nueva;
  iniciar(nueva);
}

async function iniciar(c) {
  try {
    await c.start();
    avisar(RECONECTADO); // por si algo cambió mientras se conectaba
  } catch {
    programarInicio(c);
  }
}

function programarInicio(c) {
  clearTimeout(reintento);
  reintento = setTimeout(() => {
    if (conexion === c && c.state === HubConnectionState.Disconnected) iniciar(c);
  }, REINTENTO_INICIAL_MS);
}

export function desconectarEnVivo() {
  clearTimeout(reintento);
  const anterior = conexion;
  conexion = null;
  anterior?.stop().catch(() => {});
}

/** Escucha un evento. Regresa la función para dejar de escucharlo. */
export function escucharEnVivo(evento, fn) {
  if (!oyentes.has(evento)) oyentes.set(evento, new Set());
  oyentes.get(evento).add(fn);
  return () => oyentes.get(evento)?.delete(fn);
}

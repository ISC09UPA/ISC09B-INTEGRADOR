/**
 * Cliente simulado de red.
 *
 * TODA la app consume datos a través de `api.get/post/patch/delete`.
 * Hoy este archivo responde con una «base de datos» en memoria (mock),
 * pero está diseñado para que mañana solo se sustituya el cuerpo de
 * `request` por fetch contra la API real (o el modo local de la Raspberry Pi)
 * sin tocar ninguna pantalla ni servicio.
 */
import {
  USUARIO,
  DISPOSITIVO,
  PLANTAS,
  LECTURAS,
  RIEGO,
  CONSUMO_SEMANAL,
  EVENTOS_RIEGO,
  ALERTAS,
  GALERIA,
  HISTORIAL_SENSORES,
  PERFIL,
  NOTIFICACIONES,
  GUIA_SOPORTE,
  FOTO_PLANTA,
  MES_MOCK,
} from '../data/mock';

// Latencia simulada de la red (ms). 0 para desactivarla.
const LATENCIA_MIN = 300;
const LATENCIA_MAX = 650;

// Probabilidad de fallo de red simulado (0 = sin fallos). Súbela para
// probar los estados de error de las pantallas.
const PROBABILIDAD_FALLO = 0;

/** Error tipado de la API; conserva el mensaje para mostrarlo al usuario. */
export class ApiError extends Error {
  constructor(mensaje, codigo = 'API_ERROR') {
    super(mensaje);
    this.name = 'ApiError';
    this.codigo = codigo;
  }
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

const esCorreoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

// Contador local para ids únicos. Date.now() puede colisionar si dos
// peticiones se completan en el mismo milisegundo (p. ej., un doble toque),
// lo que generaba registros con la misma key y avisos de React.
let contadorIds = 0;
const generarId = (prefijo) => `${prefijo}${Date.now()}-${(contadorIds += 1)}`;

/* ------------------------------------------------------------------ */
/* «Base de datos» en memoria: clonamos los datos mock para poder      */
/* mutarlos durante la sesión (leer alertas, crear plantas, etc.).     */
/*                                                                    */
/* IMPORTANTE: todo vive SOLO en la memoria del proceso JavaScript.    */
/* Nada se escribe en disco (únicamente la sesión va a SecureStore).   */
/* En desarrollo, Fast Refresh y el simple segundo plano conservan     */
/* este estado; un reinicio REAL (Reload de Expo Go / «r» en Metro /   */
/* cerrar el proceso) restaura los datos mock originales.              */
/* ------------------------------------------------------------------ */
const db = {
  usuarios: [USUARIO],
  sesion: null, // { token, usuario } | null
  dispositivo: { ...DISPOSITIVO },
  plantas: PLANTAS.map((p) => ({ ...p })),
  plantaActivaId: PLANTAS[0].id,
  lecturas: {
    ...LECTURAS,
    actualizadoEn: Date.now() - 2 * 60 * 1000, // «Hace 2 min»
  },
  riego: {
    ...RIEGO,
    bomba: { ...RIEGO.bomba },
  },
  consumo: CONSUMO_SEMANAL,
  eventosRiego: EVENTOS_RIEGO.map((e) => ({ ...e })),
  alertas: ALERTAS.map((a) => ({ ...a })),
  galeria: GALERIA.map((f) => ({ ...f })),
  fotoPlanta: { ...FOTO_PLANTA },
  perfil: { ...PERFIL },
  notificaciones: { ...NOTIFICACIONES },
  historial: HISTORIAL_SENSORES,
  guia: GUIA_SOPORTE,
};

/* ------------------------------------------------------------------ */
/* Handlers de endpoints (simulan las rutas del backend).              */
/* La clave es «MÉTODO /ruta».                                         */
/* ------------------------------------------------------------------ */
const ENDPOINTS = {
  'POST /auth/login': ({ body }) => {
    const usuario = db.usuarios.find((u) => u.email === body.email);
    if (!usuario || usuario.contrasena !== body.contrasena) {
      throw new ApiError('Correo o contraseña incorrectos. Inténtalo de nuevo.', 'CREDENCIALES_INVALIDAS');
    }
    db.sesion = { token: `token-mock-${Date.now()}`, usuario: { ...usuario } };
    return { ...db.sesion };
  },

  'POST /auth/register': ({ body }) => {
    if (!esCorreoValido(body.email)) {
      throw new ApiError('Ingresa un correo electrónico válido.', 'CORREO_INVALIDO');
    }
    if ((body.contrasena || '').length < 8) {
      throw new ApiError('La contraseña debe tener al menos 8 caracteres.', 'CONTRASENA_CORTA');
    }
    if (db.usuarios.some((u) => u.email === body.email)) {
      throw new ApiError('Este correo ya está registrado.', 'CORREO_DUPLICADO');
    }
    // El mockup no pide nombre: se deriva de la parte local del correo.
    const nombreCompleto =
      body.email
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .trim()
        .split(' ')
        .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join(' ') || 'Usuario';
    const usuario = {
      id: `u${db.usuarios.length + 1}`,
      nombre: nombreCompleto.split(' ')[0],
      nombreCompleto,
      email: body.email,
      contrasena: body.contrasena,
      rol: 'Administrador',
    };
    db.usuarios.push(usuario);
    db.sesion = { token: `token-mock-${Date.now()}`, usuario: { ...usuario } };
    return { ...db.sesion };
  },

  'GET /sensors/readings': () => {
    // Pequeña deriva aleatoria para simular lecturas en vivo.
    const deriva = () => 1 + (Math.random() - 0.5) * 0.01;
    db.lecturas.suelo.valor = Number((db.lecturas.suelo.valor * deriva()).toFixed(0));
    db.lecturas.temperatura.valor = Number((db.lecturas.temperatura.valor * deriva()).toFixed(1));
    db.lecturas.ambiente.valor = Number((db.lecturas.ambiente.valor * deriva()).toFixed(0));
    db.lecturas.luminosidad.valor = Math.round(db.lecturas.luminosidad.valor * deriva());
    db.lecturas.actualizadoEn = Date.now();
    return { ...db.lecturas };
  },

  'GET /sensors/history': ({ params }) => {
    const periodo = params?.periodo ?? '7d';
    return db.historial[periodo] ?? db.historial['7d'];
  },

  'GET /watering/state': () => ({ ...db.riego }),

  'PATCH /watering/auto': ({ body }) => {
    db.riego.automatico = !!body.automatico;
    return { ...db.riego };
  },

  'PATCH /watering/threshold': ({ body }) => {
    const valor = Math.min(Math.max(body.umbral, db.riego.umbralMin), db.riego.umbralMax);
    db.riego.umbral = valor;
    return { ...db.riego };
  },

  'POST /watering/start': ({ body }) => {
    if (db.riego.bomba.estado === 'regando') {
      throw new ApiError('La bomba ya está regando.', 'BOMBA_OCUPADA');
    }
    if (db.riego.bomba.estado === 'desconectada') {
      throw new ApiError('La bomba está desconectada.', 'BOMBA_DESCONECTADA');
    }
    db.riego.bomba.estado = 'regando';
    db.riego.bomba.segundosRestantes = body.segundos;
    // El evento queda registrado de inmediato (en el backend real
    // se registraría al terminar el riego). Mes mock = junio.
    const evento = {
      id: generarId('e'),
      tipo: 'Manual',
      fechaEtiqueta: 'Hoy, ahora',
      mes: MES_MOCK,
      duracion: `${body.segundos} s`,
      litros: `${(body.segundos * 0.027).toFixed(1)} L`,
    };
    db.eventosRiego.unshift(evento);
    return { ...db.riego, evento };
  },

  'POST /watering/stop': () => {
    db.riego.bomba.estado = 'ready';
    db.riego.bomba.segundosRestantes = 0;
    return { ...db.riego };
  },

  'GET /watering/events': ({ params }) => {
    const mes = Number(params?.mes ?? MES_MOCK);
    return db.eventosRiego.filter((e) => e.mes === mes);
  },

  'GET /watering/consumption': () => ({ ...db.consumo }),

  'GET /plants': () => ({ plantas: db.plantas, plantaActivaId: db.plantaActivaId }),

  // Fotos de una planta específica (galería por planta, nueva pantalla).
  // No altera la galería general (GET /gallery).
  'GET /plants/photos': ({ params }) =>
    db.galeria
      .filter((f) => f.plantaId === params?.plantaId)
      .map((f) => ({ ...f })),

  'POST /plants': ({ body }) => {
    const planta = {
      id: generarId('p'),
      nombre: body.nombre,
      especie: body.especie,
      ubicacion: 'Invernadero principal',
      enLinea: true,
      dispositivoId: body.dispositivoId,
      colorFoto: '#5E9B47',
    };
    db.plantas.push(planta);
    return planta;
  },

  'PATCH /plants/active': ({ body }) => {
    db.plantaActivaId = body.id;
    return { plantaActivaId: db.plantaActivaId };
  },

  'GET /device': () => ({ ...db.dispositivo }),

  'GET /alerts': () => db.alertas.map((a) => ({ ...a })),

  'POST /alerts/read-all': () => {
    db.alertas.forEach((a) => {
      a.leida = true;
    });
    return db.alertas.map((a) => ({ ...a }));
  },

  'GET /gallery': () => ({ fotos: db.galeria.map((f) => ({ ...f })), fotoPlanta: { ...db.fotoPlanta } }),

  'POST /gallery/photo': () => {
    const foto = {
      id: generarId('f'),
      etiqueta: 'Hoy',
      color: ['#5E9B47', '#4E8A6A', '#6FAE55', '#7CB24F'][Math.floor(Math.random() * 4)],
    };
    db.galeria.unshift(foto);
    db.fotoPlanta = { etiqueta: `Hoy, ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`, color: foto.color };
    return { foto, fotoPlanta: { ...db.fotoPlanta } };
  },

  'POST /gallery/remove': ({ body }) => {
    db.galeria = db.galeria.filter((f) => f.id !== body.id);
    return { ok: true };
  },

  'GET /profile': () => ({ ...db.perfil }),

  'PATCH /profile': ({ body }) => {
    db.perfil = { ...db.perfil, ...body };
    return { ...db.perfil };
  },

  'GET /notifications': () => ({ ...db.notificaciones }),

  'PATCH /notifications': ({ body }) => {
    db.notificaciones = { ...db.notificaciones, ...body };
    return { ...db.notificaciones };
  },

  'GET /guide': () => ({ ...db.guia }),
};

/** Núcleo del transporte simulado. Sustituir por fetch real más adelante. */
async function request(metodo, ruta, { body, params } = {}) {
  await esperar(LATENCIA_MIN + Math.random() * (LATENCIA_MAX - LATENCIA_MIN));

  // Simula fallos de red ocasionales (para probar estados de error).
  if (PROBABILIDAD_FALLO > 0 && Math.random() < PROBABILIDAD_FALLO) {
    throw new ApiError('No se pudo conectar con el servidor. Inténtalo de nuevo.', 'SIN_CONEXION');
  }

  const handler = ENDPOINTS[`${metodo} ${ruta}`];
  if (!handler) {
    throw new ApiError(`Endpoint no implementado: ${metodo} ${ruta}`, 'NO_ENCONTRADO');
  }
  return handler({ body, params });
}

/** API pública usada por los servicios. Misma firma que fetch/axios. */
export const api = {
  get: (ruta, params) => request('GET', ruta, { params }),
  post: (ruta, body) => request('POST', ruta, { body }),
  patch: (ruta, body) => request('PATCH', ruta, { body }),
  delete: (ruta) => request('DELETE', ruta),
};

import { Platform } from 'react-native';

// Una función por endpoint del backend. Los nombres de los campos que regresan
// son los mismos que los DTOs del back (en camelCase), por ejemplo:
//   cajones.mapa() → { libres, total, plumaAbierta, cajones: [{ numero, estado, esMio }] }
// Los enums viajan como texto: "Libre", "Ocupado", "Usuario", "Administrador", "Carro", "Camion"...
import { pedir } from './cliente';

export { API_URL, ErrorApi, guardarToken, borrarToken } from './cliente';

// ---- Auth (pantalla 1 y Perfil) ----
export const auth = {
  /** { correo, contrasena, rol: "Usuario" | "Administrador" } → { token, expira, usuario } */
  login: (datos) => pedir('POST', '/api/auth/login', { cuerpo: datos }),
  /** { nombre, correo, contrasena } → { token, expira, usuario } (siempre rol Usuario) */
  registro: (datos) => pedir('POST', '/api/auth/registro', { cuerpo: datos }),
  /** → { id, nombre, correo, rol, placas: ["ABC-123-A"] } */
  yo: () => pedir('GET', '/api/auth/yo'),
};

// ---- Cajones (pantallas 2 y 3) ----
export const cajones = {
  mapa: () => pedir('GET', '/api/cajones'),
  /** → { numero, estado, esMio, vehiculo: { placa, tipo, fotoUrl, horaEntrada, horaSalida, minutosEstancia } | null } */
  detalle: (numero) => pedir('GET', `/api/cajones/${numero}`),
};

// ---- Historial del usuario (pantalla 4) ----
export const historial = {
  /** periodo: "Semana" | "Mes" | "Todo" */
  listar: (periodo) => pedir('GET', '/api/historial', { query: { periodo } }),
  /** → { accesoId, cajon, placa, horaEntrada, minutosEstancia } o null si no tiene auto dentro (204) */
  actual: () => pedir('GET', '/api/historial/actual'),
  /** mes: "2026-10" o vacío para el actual → { mes, visitas, minutosPromedio, cajonFrecuente } */
  resumen: (mes) => pedir('GET', '/api/historial/resumen', { query: { mes } }),
};

// ---- Estadísticas del administrador (pantalla 5) ----
export const estadisticas = {
  /** → { fecha, ocupados, total, entradasHoy, entradasNegadasHoy, minutosPromedio, cajonMasUsado } */
  panel: (fecha) => pedir('GET', '/api/estadisticas/panel', { query: { fecha } }),
  /** → [{ hora: 0..23, cajonesOcupados, entradas }] */
  ocupacionPorHora: (fecha) => pedir('GET', '/api/estadisticas/ocupacion-por-hora', { query: { fecha } }),
  /** → [{ cajon, usos }] */
  usoPorCajon: (desde, hasta) => pedir('GET', '/api/estadisticas/uso-por-cajon', { query: { desde, hasta } }),
};

// ---- Vehículos (pantalla 6) ----
export const vehiculos = {
  /** filtro: "Todos" | "Dentro" | "Fuera" | "Baja" → [{ id, placa, placaLegible, tipo, estado, dentro, cajon, ultimaSalida, correoUsuario }] */
  listar: (placa, filtro) => pedir('GET', '/api/vehiculos', { query: { placa, filtro } }),
  /** { placa, tipo, correoUsuario? } */
  alta: (datos) => pedir('POST', '/api/vehiculos', { cuerpo: datos }),
  baja: (id) => pedir('PATCH', `/api/vehiculos/${id}/baja`),
  reactivar: (id) => pedir('PATCH', `/api/vehiculos/${id}/reactivar`),
  corregirPlaca: (id, placa) => pedir('PATCH', `/api/vehiculos/${id}/placa`, { cuerpo: { placa } }),
};

// ---- Alertas del administrador ----
export const alertas = {
  /** → [{ id, tipo: "EntradaNegada" | "PlacaNoLegible" | "CajonSinSalida", mensaje, placa, fotoUrl, vehiculoId, fecha, atendida }] */
  listar: (pendientes = true) => pedir('GET', '/api/alertas', { query: { pendientes } }),
  atender: (id) => pedir('PATCH', `/api/alertas/${id}/atender`),
};

// ---- Escáner y pluma (pantalla 7) ----
export const escaner = {
  /**
   * Sube la foto y regresa la vista previa (no guarda nada):
   * { placa, confianza, tipo, fotoBlob, fotoUrl, seRegistraraComo, entradaAbierta, seAbriraPluma, lugaresLibres }
   */
  analizar: async (fotoUri, tipoContenido = 'image/jpeg') => {
    const formulario = new FormData();
    const nombre = `placa.${tipoContenido === 'image/png' ? 'png' : 'jpg'}`;
    if (Platform.OS === 'web') {
      // En el navegador FormData necesita un Blob, no { uri }.
      const blob = await (await fetch(fotoUri)).blob();
      formulario.append('foto', blob, nombre);
    } else {
      formulario.append('foto', { uri: fotoUri, name: nombre, type: tipoContenido });
    }
    return pedir('POST', '/api/escaner/analizar', { formulario });
  },
  /** { placa, tipo, fotoBlob } → { accion: "Abrir" | "Negar", tipo, motivo, placa, accesoId, minutosEstancia } */
  registrar: (datos) => pedir('POST', '/api/escaner/registrar', { cuerpo: datos }),
};

export const pluma = {
  /** Apertura manual, sin validar cupo. Responde 202. */
  abrir: (motivo) => pedir('POST', '/api/pluma/abrir', { cuerpo: { motivo: motivo || null } }),
  /** → { abierta, ultimoCambio } */
  estado: () => pedir('GET', '/api/pluma/estado'),
};

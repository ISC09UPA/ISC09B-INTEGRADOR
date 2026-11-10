// Tipos que reflejan los DTOs del backend (AlimentadorInteligente.Application/DTOs).
// Los enums viajan como texto (JsonStringEnumConverter) y las propiedades en camelCase.

export type Especie = 'Perro' | 'Gato';
export type NivelActividad = 'Bajo' | 'Moderado' | 'Alto';
export type ClaseDetectada = 'Perro' | 'Gato' | 'Paloma' | 'Nada';
export type RolAlimentador = 'Dueno' | 'Cuidador';
export type TipoAlerta =
  | 'NoHaComido'
  | 'BajaApetito'
  | 'Atasco'
  | 'TolvaBaja'
  | 'AlimentadorSinConexion'
  | 'GatewaySinConexion'
  | 'ConexionRestablecida';
export type TipoComando = 'Dispensar' | 'Ota';
export type EstadoComando = 'Pendiente' | 'Entregado' | 'Completado' | 'Fallido' | 'Vencido';
export type TipoArtefactoOta = 'Firmware' | 'Modelo';

/** Fecha y hora ISO 8601 con desfase (DateTimeOffset). */
export type IsoDateTime = string;
/** Fecha ISO sin hora (DateOnly), p. ej. "2026-11-10". */
export type IsoDate = string;
/** Hora del día (TimeOnly), p. ej. "08:00:00". */
export type IsoTime = string;

// --- Auth ---
export interface RegistroRequest {
  nombre: string;
  email: string;
  password: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface RefreshRequest {
  refreshToken: string;
}
export interface AuthResponse {
  usuarioId: number;
  nombre: string;
  accessToken: string;
  expiraEn: IsoDateTime;
  refreshToken: string;
}
export interface PushTokenRequest {
  expoPushToken: string;
}

// --- Alimentadores ---
export interface EstadoAlimentadorDto {
  enLinea: boolean;
  gatewayEnLinea: boolean;
  nivelTolvaPerroPorcentaje: number | null;
  nivelTolvaGatoPorcentaje: number | null;
  pesoPlatoPerroG: number | null;
  pesoPlatoGatoG: number | null;
  versionFirmware: string | null;
  versionModelo: string | null;
  ultimaSincronizacion: IsoDateTime | null;
  dispensadoRemotoDisponible: boolean;
}

export interface AlimentadorDto {
  id: number;
  codigo: string;
  nombre: string;
  kcalPorGramo: number;
  intervaloMinimoHoras: number;
  zonaHoraria: string;
  miRol: RolAlimentador;
  estado: EstadoAlimentadorDto;
}

export interface CrearAlimentadorRequest {
  codigo: string;
  nombre: string;
  kcalPorGramo: number;
  gatewayDeviceId: string | null;
  zonaHoraria?: string | null;
}
export interface ActualizarAlimentadorRequest {
  nombre: string;
  kcalPorGramo: number;
  intervaloMinimoHoras: number;
  zonaHoraria?: string | null;
  gatewayDeviceId?: string | null;
}

export interface GatewayDto {
  id: number;
  deviceId: string;
  ultimoHeartbeat: IsoDateTime | null;
  sincronizando: boolean;
}
export interface CrearGatewayRequest {
  deviceId: string;
}
export interface GatewayClaveResponse {
  id: number;
  deviceId: string;
  clave: string;
}

export interface MiembroDto {
  usuarioId: number;
  nombre: string;
  email: string;
  rol: RolAlimentador;
}
export interface AgregarMiembroRequest {
  email: string;
  rol: RolAlimentador;
}

// --- Mascotas y horarios ---
export interface MascotaDto {
  id: number;
  alimentadorId: number;
  nombre: string;
  especie: Especie;
  tolva: number;
  pesoKg: number;
  edadMeses: number;
  nivelActividad: NivelActividad;
  esterilizado: boolean;
  comidasPorDia: number;
  etiquetaRfid: string | null;
  ajustePorcentaje: number;
  gramosPorDiaRecomendados: number;
  gramosPorComida: number;
}
export interface GuardarMascotaRequest {
  nombre: string;
  especie: Especie;
  pesoKg: number;
  edadMeses: number;
  nivelActividad: NivelActividad;
  esterilizado: boolean;
  comidasPorDia: number;
  etiquetaRfid: string | null;
}

export interface HorarioDto {
  id: number;
  mascotaId: number | null;
  hora: IsoTime;
  activo: boolean;
}
export interface GuardarHorarioRequest {
  mascotaId: number | null;
  hora: IsoTime;
  activo: boolean;
}

// --- Historial, alertas y comandos ---
export interface VisitaDto {
  id: number;
  eventId: string;
  mascotaId: number | null;
  clase: ClaseDetectada;
  confianza: number;
  iniciadaEn: IsoDateTime;
  terminadaEn: IsoDateTime;
  platoAntesG: number;
  dispensadoG: number;
  platoDespuesG: number;
  consumidoG: number;
}

export interface ConsumoDiarioDto {
  dia: IsoDate;
  recomendadoG: number;
  dispensadoG: number;
  consumidoG: number;
  visitas: number;
}

export interface AlertaDto {
  id: number;
  alimentadorId: number;
  mascotaId: number | null;
  tipo: TipoAlerta;
  mensaje: string;
  ocurridaEn: IsoDateTime;
  creadaEn: IsoDateTime;
  leida: boolean;
}

export interface ComandoDto {
  id: number;
  alimentadorId: number;
  tipo: TipoComando;
  estado: EstadoComando;
  mascotaId: number | null;
  tolva: number | null;
  gramos: number | null;
  dispensadoG: number | null;
  error: string | null;
  creadoEn: IsoDateTime;
}

/** Con mascota, la tolva sale de su especie; sin mascota hay que indicar la tolva (1 perro, 2 gato). */
export interface DispensarRequest {
  gramos: number;
  mascotaId: number | null;
  tolva?: number | null;
}

export interface ArtefactoOtaDto {
  id: number;
  tipo: TipoArtefactoOta;
  version: string;
  sha256: string;
  tamanoBytes: number;
  creadoEn: IsoDateTime;
}
export interface LanzarOtaRequest {
  artefactoId: number;
}

/** Cuerpo de error del backend (ProblemDetails, RFC 7807). */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

// --- Eventos de SignalR ---
export interface EstadoAlimentadorEvento {
  alimentadorId: number;
  estado: EstadoAlimentadorDto;
}

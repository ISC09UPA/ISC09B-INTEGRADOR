/**
 * Tipos del contrato de la API (ADMIN_API.md) y de los DTOs existentes del backend.
 * JSON en camelCase, enums como texto y fechas ISO 8601 con zona.
 */

/** Fecha ISO 8601 con zona (DateTimeOffset en el backend). */
export type FechaIso = string;

// ---------- Enums (AlimentadorInteligente.Domain/Enums/Enums.cs) ----------

export type Especie = 'Perro' | 'Gato';
export type ClaseDetectada = 'Perro' | 'Gato' | 'Paloma' | 'Nada';
export type RolAlimentador = 'Dueno' | 'Cuidador';
export type TipoEvento = 'Jam' | 'HopperLow';
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

export const CLASES_DETECTADAS: readonly ClaseDetectada[] = ['Perro', 'Gato', 'Paloma', 'Nada'];
export const ESTADOS_COMANDO: readonly EstadoComando[] = [
  'Pendiente',
  'Entregado',
  'Completado',
  'Fallido',
  'Vencido',
];

// ---------- Comunes ----------

/** Respuesta paginada: `?pagina=1&tamano=25`. */
export interface Pagina<T> {
  elementos: T[];
  total: number;
  pagina: number;
  tamano: number;
}

/** Errores RFC 7807 que devuelve el backend. */
export interface ProblemDetails {
  type?: string;
  status?: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface UsuarioRef {
  id: number;
  nombre: string;
  email: string;
}

// ---------- Auth (AuthDtos.cs + contrato §1) ----------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  usuarioId: number;
  nombre: string;
  accessToken: string;
  expiraEn: FechaIso;
  refreshToken: string;
  esAdministrador: boolean;
}

export interface YoDto {
  id: number;
  nombre: string;
  email: string;
  esAdministrador: boolean;
}

// ---------- Resumen (§2) ----------

export interface VersionConteo {
  version: string | null;
  alimentadores: number;
}

export interface ResumenAdminDto {
  usuarios: { total: number; activos: number; administradores: number; nuevos7Dias: number };
  alimentadores: { total: number; enLinea: number; sinConexion: number; sinGateway: number };
  gateways: { total: number; enLinea: number; sinConexion: number; sincronizando: number };
  mascotas: { activas: number; perros: number; gatos: number };
  alertas24h: number;
  ota: { artefactos: number; enCurso: number; fallidas7Dias: number };
  fotosPorRevisar: number;
  versionesFirmware: VersionConteo[];
  versionesModelo: VersionConteo[];
}

// ---------- Usuarios (§3) ----------

export interface UsuarioAdminDto {
  id: number;
  nombre: string;
  email: string;
  esAdministrador: boolean;
  activo: boolean;
  creadoEn: FechaIso;
  ultimoAcceso: FechaIso | null;
  alimentadores: number;
  gateways: number;
}

export interface MembresiaAdminDto {
  alimentadorId: number;
  codigo: string;
  nombre: string;
  rol: RolAlimentador;
}

export interface GatewayRefDto {
  id: number;
  deviceId: string;
  enLinea: boolean;
}

export interface UsuarioAdminDetalleDto extends UsuarioAdminDto {
  membresias: MembresiaAdminDto[];
  listaGateways: GatewayRefDto[];
}

export interface CambiarAdministradorRequest {
  esAdministrador: boolean;
}

export interface CambiarActivoRequest {
  activo: boolean;
}

// ---------- Alimentadores (§4) ----------

/** EstadoAlimentadorDto existente (AlimentadorDtos.cs). */
export interface EstadoAlimentadorDto {
  enLinea: boolean;
  gatewayEnLinea: boolean;
  nivelTolvaPerroPorcentaje: number | null;
  nivelTolvaGatoPorcentaje: number | null;
  pesoPlatoPerroG: number | null;
  pesoPlatoGatoG: number | null;
  versionFirmware: string | null;
  versionModelo: string | null;
  ultimaSincronizacion: FechaIso | null;
  dispensadoRemotoDisponible: boolean;
}

export type FiltroEstadoAlimentador = 'todos' | 'enLinea' | 'sinConexion' | 'sinGateway';

export interface AlimentadorAdminDto {
  id: number;
  codigo: string;
  nombre: string;
  zonaHoraria: string;
  dueno: UsuarioRef | null;
  miembros: number;
  mascotas: number;
  gateway: GatewayRefDto | null;
  estado: EstadoAlimentadorDto;
  versionConfiguracion: number;
  creadoEn: FechaIso;
}

/** MiembroDto existente. */
export interface MiembroDto {
  usuarioId: number;
  nombre: string;
  email: string;
  rol: RolAlimentador;
}

export interface MascotaAdminDto {
  id: number;
  nombre: string;
  especie: Especie;
  tolva: number;
  pesoKg: number;
  edadMeses: number;
  comidasPorDia: number;
  etiquetaRfid: string | null;
  ajustePorcentaje: number;
  gramosPorDiaRecomendados: number;
  activa: boolean;
  ultimaVisita: FechaIso | null;
}

export interface HorarioAdminDto {
  id: number;
  /** Formato HH:mm */
  hora: string;
  mascotaId: number | null;
  activo: boolean;
}

/** AlertaDto existente (VisitaDtos.cs). */
export interface AlertaDto {
  id: number;
  alimentadorId: number;
  mascotaId: number | null;
  tipo: TipoAlerta;
  mensaje: string;
  ocurridaEn: FechaIso;
  creadaEn: FechaIso;
  leida: boolean;
}

export interface AlimentadorAdminDetalleDto extends AlimentadorAdminDto {
  kcalPorGramo: number;
  intervaloMinimoHoras: number;
  listaMiembros: MiembroDto[];
  listaMascotas: MascotaAdminDto[];
  horarios: HorarioAdminDto[];
  ultimosComandos: ComandoAdminDto[];
  ultimasAlertas: AlertaDto[];
}

// ---------- Embebidos (§5) ----------

export interface AlimentadorDeGatewayDto {
  id: number;
  codigo: string;
  nombre: string;
  enLinea: boolean;
  ultimoEstado: FechaIso | null;
  versionFirmware: string | null;
  versionModelo: string | null;
  nivelTolvaPerroPorcentaje: number | null;
  nivelTolvaGatoPorcentaje: number | null;
}

export interface GatewayAdminDto {
  id: number;
  deviceId: string;
  propietario: UsuarioRef | null;
  ultimoHeartbeat: FechaIso | null;
  enLinea: boolean;
  sinConexionDesde: FechaIso | null;
  sincronizando: boolean;
  sincronizandoDesde: FechaIso | null;
  creadoEn: FechaIso;
  alimentadores: AlimentadorDeGatewayDto[];
}

/** GatewayClaveResponse existente: la clave se muestra una sola vez. */
export interface GatewayClaveResponse {
  id: number;
  deviceId: string;
  clave: string;
}

export interface EventoAdminDto {
  id: number;
  alimentadorId: number;
  alimentadorCodigo: string;
  tipo: TipoEvento;
  /** 1 perro, 2 gato; null si el evento no indicó tolva. */
  tolva: number | null;
  ocurridoEn: FechaIso;
  detalle: string | null;
}

export type FiltroFotos = 'pendientes' | 'revisadas' | 'todas';

export interface FotoDudosaAdminDto {
  id: number;
  alimentadorId: number;
  alimentadorCodigo: string;
  clasePredicha: ClaseDetectada;
  confianza: number;
  tomadaEn: FechaIso;
  subida: boolean;
  claseRevisada: ClaseDetectada | null;
  url: string | null;
}

export interface RevisarFotoRequest {
  clase: ClaseDetectada;
}

// ---------- OTA (§6) ----------

/** ArtefactoOtaDto existente. */
export interface ArtefactoOtaDto {
  id: number;
  tipo: TipoArtefactoOta;
  version: string;
  sha256: string;
  tamanoBytes: number;
  creadoEn: FechaIso;
}

export interface ComandoAdminDto {
  id: number;
  alimentadorId: number;
  alimentadorCodigo: string;
  alimentadorNombre: string;
  tipo: TipoComando;
  estado: EstadoComando;
  artefacto: { id: number; tipo: TipoArtefactoOta; version: string } | null;
  solicitadoPor: { id: number; nombre: string } | null;
  creadoEn: FechaIso;
  entregadoEn: FechaIso | null;
  completadoEn: FechaIso | null;
  gramos: number | null;
  dispensadoG: number | null;
  error: string | null;
}

export interface LanzarDespliegueRequest {
  artefactoId: number;
  alimentadorIds: number[];
  omitirSiYaTieneVersion: boolean;
}

export interface DespliegueOmitido {
  alimentadorId: number;
  motivo: string;
}

export interface LanzarDespliegueResponse {
  creados: ComandoAdminDto[];
  omitidos: DespliegueOmitido[];
}

/** Límite del backend para artefactos OTA (Constantes.MaxTamanoArtefactoOta). */
export const MAX_TAMANO_ARTEFACTO = 32 * 1024 * 1024;

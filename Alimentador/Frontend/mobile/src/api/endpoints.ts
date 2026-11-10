import { request } from './client';
import type {
  AgregarMiembroRequest,
  AlertaDto,
  AlimentadorDto,
  ActualizarAlimentadorRequest,
  ArtefactoOtaDto,
  AuthResponse,
  ComandoDto,
  ConsumoDiarioDto,
  CrearAlimentadorRequest,
  DispensarRequest,
  GatewayClaveResponse,
  GatewayDto,
  GuardarHorarioRequest,
  GuardarMascotaRequest,
  HorarioDto,
  IsoDate,
  IsoDateTime,
  LoginRequest,
  MascotaDto,
  MiembroDto,
  RegistroRequest,
  RolAlimentador,
  VisitaDto,
} from './types';

export const authApi = {
  registro: (datos: RegistroRequest) =>
    request<AuthResponse>('/api/auth/registro', { method: 'POST', body: datos, auth: false }),
  login: (datos: LoginRequest) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: datos, auth: false }),
  refresh: (refreshToken: string) =>
    request<AuthResponse>('/api/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }),
  logout: (refreshToken: string) =>
    request<void>('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
  pushToken: (expoPushToken: string) =>
    request<void>('/api/auth/push-token', { method: 'PUT', body: { expoPushToken } }),
};

export const gatewaysApi = {
  listar: () => request<GatewayDto[]>('/api/gateways'),
  crear: (deviceId: string) =>
    request<GatewayClaveResponse>('/api/gateways', { method: 'POST', body: { deviceId } }),
  regenerarClave: (id: number) =>
    request<GatewayClaveResponse>(`/api/gateways/${id}/regenerar-clave`, { method: 'POST' }),
};

export const alimentadoresApi = {
  listar: () => request<AlimentadorDto[]>('/api/alimentadores'),
  obtener: (id: number) => request<AlimentadorDto>(`/api/alimentadores/${id}`),
  crear: (datos: CrearAlimentadorRequest) =>
    request<AlimentadorDto>('/api/alimentadores', { method: 'POST', body: datos }),
  actualizar: (id: number, datos: ActualizarAlimentadorRequest) =>
    request<AlimentadorDto>(`/api/alimentadores/${id}`, { method: 'PUT', body: datos }),

  miembros: (id: number) => request<MiembroDto[]>(`/api/alimentadores/${id}/miembros`),
  agregarMiembro: (id: number, datos: AgregarMiembroRequest) =>
    request<MiembroDto>(`/api/alimentadores/${id}/miembros`, { method: 'POST', body: datos }),
  cambiarRol: (id: number, usuarioId: number, rol: RolAlimentador) =>
    request<void>(`/api/alimentadores/${id}/miembros/${usuarioId}`, { method: 'PUT', body: { rol } }),
  quitarMiembro: (id: number, usuarioId: number) =>
    request<void>(`/api/alimentadores/${id}/miembros/${usuarioId}`, { method: 'DELETE' }),

  /** 202 Accepted: el resultado llega después por SignalR (ComandoActualizado). */
  dispensar: (id: number, datos: DispensarRequest) =>
    request<ComandoDto>(`/api/alimentadores/${id}/dispensar`, { method: 'POST', body: datos }),
  comandos: (id: number) => request<ComandoDto[]>(`/api/alimentadores/${id}/comandos`),
  /** Solo Dueño. */
  lanzarOta: (id: number, artefactoId: number) =>
    request<ComandoDto>(`/api/alimentadores/${id}/ota`, { method: 'POST', body: { artefactoId } }),
};

export const mascotasApi = {
  listar: (alimentadorId: number) => request<MascotaDto[]>(`/api/alimentadores/${alimentadorId}/mascotas`),
  crear: (alimentadorId: number, datos: GuardarMascotaRequest) =>
    request<MascotaDto>(`/api/alimentadores/${alimentadorId}/mascotas`, { method: 'POST', body: datos }),
  obtener: (id: number) => request<MascotaDto>(`/api/mascotas/${id}`),
  actualizar: (id: number, datos: GuardarMascotaRequest) =>
    request<MascotaDto>(`/api/mascotas/${id}`, { method: 'PUT', body: datos }),
  /** Baja lógica: el historial se conserva. */
  eliminar: (id: number) => request<void>(`/api/mascotas/${id}`, { method: 'DELETE' }),
  visitas: (id: number, desde?: IsoDateTime, hasta?: IsoDateTime) =>
    request<VisitaDto[]>(`/api/mascotas/${id}/visitas`, { query: { desde, hasta } }),
  /** Rango de máximo 90 días. */
  consumo: (id: number, desde: IsoDate, hasta: IsoDate) =>
    request<ConsumoDiarioDto[]>(`/api/mascotas/${id}/consumo`, { query: { desde, hasta } }),
};

export const horariosApi = {
  listar: (alimentadorId: number) => request<HorarioDto[]>(`/api/alimentadores/${alimentadorId}/horarios`),
  crear: (alimentadorId: number, datos: GuardarHorarioRequest) =>
    request<HorarioDto>(`/api/alimentadores/${alimentadorId}/horarios`, { method: 'POST', body: datos }),
  actualizar: (id: number, datos: GuardarHorarioRequest) =>
    request<HorarioDto>(`/api/horarios/${id}`, { method: 'PUT', body: datos }),
  eliminar: (id: number) => request<void>(`/api/horarios/${id}`, { method: 'DELETE' }),
};

export const alertasApi = {
  listar: (alimentadorId: number, soloNoLeidas = false) =>
    request<AlertaDto[]>(`/api/alimentadores/${alimentadorId}/alertas`, { query: { soloNoLeidas } }),
  marcarLeida: (id: number) => request<void>(`/api/alertas/${id}/leida`, { method: 'PUT' }),
};

export const otaApi = {
  artefactos: () => request<ArtefactoOtaDto[]>('/api/ota/artefactos'),
};

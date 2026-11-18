import { peticion, subirFormulario } from './cliente';
import type {
  AlimentadorAdminDetalleDto,
  AlimentadorAdminDto,
  ArtefactoOtaDto,
  AuthResponse,
  ClaseDetectada,
  ComandoAdminDto,
  EstadoComando,
  EventoAdminDto,
  FiltroEstadoAlimentador,
  FiltroFotos,
  FotoDudosaAdminDto,
  GatewayAdminDto,
  GatewayClaveResponse,
  LanzarDespliegueRequest,
  LanzarDespliegueResponse,
  LoginRequest,
  Pagina,
  ResumenAdminDto,
  TipoEvento,
  UsuarioAdminDetalleDto,
  UsuarioAdminDto,
  YoDto,
} from './types';

export interface Paginacion {
  pagina: number;
  tamano: number;
}

// ---------- Auth ----------

export const auth = {
  login: (datos: LoginRequest) =>
    peticion<AuthResponse>('/api/auth/login', { method: 'POST', body: datos, autenticada: false }),
  logout: (refreshToken: string) =>
    peticion<void>('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      autenticada: false,
    }),
  yo: (signal?: AbortSignal) => peticion<YoDto>('/api/auth/yo', { signal }),
};

// ---------- Administración ----------

export const admin = {
  resumen: (signal?: AbortSignal) => peticion<ResumenAdminDto>('/api/admin/resumen', { signal }),

  usuarios: (f: Paginacion & { buscar?: string }, signal?: AbortSignal) =>
    peticion<Pagina<UsuarioAdminDto>>('/api/admin/usuarios', { query: { ...f }, signal }),
  usuario: (id: number, signal?: AbortSignal) =>
    peticion<UsuarioAdminDetalleDto>(`/api/admin/usuarios/${id}`, { signal }),
  cambiarAdministrador: (id: number, esAdministrador: boolean) =>
    peticion<UsuarioAdminDto>(`/api/admin/usuarios/${id}/administrador`, {
      method: 'PUT',
      body: { esAdministrador },
    }),
  cambiarActivo: (id: number, activo: boolean) =>
    peticion<UsuarioAdminDto>(`/api/admin/usuarios/${id}/activo`, {
      method: 'PUT',
      body: { activo },
    }),

  alimentadores: (
    f: Paginacion & { buscar?: string; estado?: FiltroEstadoAlimentador },
    signal?: AbortSignal,
  ) =>
    peticion<Pagina<AlimentadorAdminDto>>('/api/admin/alimentadores', { query: { ...f }, signal }),
  alimentador: (id: number, signal?: AbortSignal) =>
    peticion<AlimentadorAdminDetalleDto>(`/api/admin/alimentadores/${id}`, { signal }),

  gateways: (signal?: AbortSignal) => peticion<GatewayAdminDto[]>('/api/admin/gateways', { signal }),
  regenerarClave: (id: number) =>
    peticion<GatewayClaveResponse>(`/api/admin/gateways/${id}/regenerar-clave`, { method: 'POST' }),

  eventos: (
    f: Paginacion & { alimentadorId?: number | null; tipo?: TipoEvento | null },
    signal?: AbortSignal,
  ) => peticion<Pagina<EventoAdminDto>>('/api/admin/eventos', { query: { ...f }, signal }),

  fotos: (f: Paginacion & { estado: FiltroFotos }, signal?: AbortSignal) =>
    peticion<Pagina<FotoDudosaAdminDto>>('/api/admin/fotos', { query: { ...f }, signal }),
  revisarFoto: (id: number, clase: ClaseDetectada) =>
    peticion<FotoDudosaAdminDto>(`/api/admin/fotos/${id}/revision`, {
      method: 'PUT',
      body: { clase },
    }),

  despliegues: (
    f: Paginacion & {
      estado?: EstadoComando | null;
      artefactoId?: number | null;
      alimentadorId?: number | null;
    },
    signal?: AbortSignal,
  ) => peticion<Pagina<ComandoAdminDto>>('/api/admin/ota/despliegues', { query: { ...f }, signal }),
  lanzarDespliegue: (datos: LanzarDespliegueRequest) =>
    peticion<LanzarDespliegueResponse>('/api/admin/ota/despliegues', {
      method: 'POST',
      body: datos,
    }),
  cancelarDespliegue: (id: number) =>
    peticion<ComandoAdminDto>(`/api/admin/ota/despliegues/${id}/cancelar`, { method: 'POST' }),
};

// ---------- OTA (endpoints existentes) ----------

export const ota = {
  artefactos: (signal?: AbortSignal) =>
    peticion<ArtefactoOtaDto[]>('/api/ota/artefactos', { signal }),
  /** `tipo` va en minúsculas como espera el backend: firmware | modelo. */
  publicar: (
    datos: { tipo: 'firmware' | 'modelo'; version: string; archivo: File },
    alProgresar: (fraccion: number) => void,
  ) => {
    const form = new FormData();
    form.set('tipo', datos.tipo);
    form.set('version', datos.version);
    form.set('archivo', datos.archivo, datos.archivo.name);
    return subirFormulario<ArtefactoOtaDto>('/api/ota/artefactos', form, alProgresar);
  },
  eliminar: (id: number) => peticion<void>(`/api/ota/artefactos/${id}`, { method: 'DELETE' }),
};

/** Claves de TanStack Query, agrupadas para invalidar por prefijo. */
export const claves = {
  resumen: ['admin', 'resumen'] as const,
  usuarios: ['admin', 'usuarios'] as const,
  alimentadores: ['admin', 'alimentadores'] as const,
  gateways: ['admin', 'gateways'] as const,
  eventos: ['admin', 'eventos'] as const,
  fotos: ['admin', 'fotos'] as const,
  despliegues: ['admin', 'despliegues'] as const,
  artefactos: ['ota', 'artefactos'] as const,
};

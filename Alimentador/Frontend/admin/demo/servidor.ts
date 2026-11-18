/**
 * Servidor de datos falsos para revisar el panel sin backend (`npm run demo` o VITE_DEMO=1).
 * Es un middleware de Vite que responde /api/* siguiendo ADMIN_API.md y las reglas principales
 * del backend: último administrador, omitidos del despliegue, cancelar solo Pendiente, etc.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';
import type {
  AlertaDto,
  AlimentadorAdminDetalleDto,
  AlimentadorAdminDto,
  ArtefactoOtaDto,
  AuthResponse,
  ClaseDetectada,
  ComandoAdminDto,
  EventoAdminDto,
  FotoDudosaAdminDto,
  GatewayAdminDto,
  Pagina,
  ResumenAdminDto,
  UsuarioAdminDetalleDto,
  UsuarioAdminDto,
  VersionConteo,
} from '../src/api/types';
import { crearBd, DIA, MIN } from './datos.ts';
import type { AlimentadorDemo, Bd, ComandoDemo, GatewayDemo, UsuarioDemo } from './datos.ts';
import { svgFoto } from './fotos.ts';

const TOLERANCIA_HEARTBEAT = 10 * MIN;
const DURACION_ACCESS = 15 * MIN;
const MAX_ARTEFACTO = 32 * 1024 * 1024;

class Problema extends Error {
  constructor(
    readonly status: number,
    readonly titulo: string,
    detalle: string,
    readonly errores?: Record<string, string[]>,
  ) {
    super(detalle);
  }
}
const regla = (d: string) => new Problema(400, 'Operación no permitida', d);
const noEncontrado = (d: string) => new Problema(404, 'No encontrado', d);
const conflicto = (d: string) => new Problema(409, 'Conflicto', d);
const validacion = (campo: string, d: string) =>
  new Problema(400, 'Datos inválidos', 'Revisa los campos marcados.', { [campo]: [d] });

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

interface Peticion {
  metodo: string;
  ruta: string;
  query: URLSearchParams;
  cuerpo: () => Promise<unknown>;
  crudo: () => Promise<Buffer>;
  encabezados: IncomingMessage['headers'];
  usuario: UsuarioDemo | null;
}

export function servidorDemo(): Plugin {
  const bd: Bd = crearBd();
  const accesos = new Map<string, { usuarioId: number; vence: number }>();
  const refrescos = new Map<string, number>();

  // ---------- Simulación del paso del tiempo ----------

  function gatewayEnLinea(g: GatewayDemo, ahora: number) {
    return g.sinConexionDesde === null && g.ultimoHeartbeat !== null && ahora - g.ultimoHeartbeat <= TOLERANCIA_HEARTBEAT;
  }

  /** Las Pi vivas mandan heartbeat; las OTA avanzan solas en los alimentadores en línea. */
  function avanzar() {
    const ahora = Date.now();
    for (const g of bd.gateways) {
      if (g.viva && ahora - (g.ultimoHeartbeat ?? 0) > 5 * MIN) g.ultimoHeartbeat = ahora - Math.round(Math.random() * MIN);
      if (g.sincronizandoDesde !== null && ahora - g.sincronizandoDesde > 12 * MIN) g.sincronizandoDesde = null;
    }
    for (const a of bd.alimentadores) {
      const g = bd.gateways.find((x) => x.id === a.gatewayId);
      if (a.enLinea && g?.viva) a.ultimoEstado = g.ultimoHeartbeat;
    }
    for (const c of bd.comandos) {
      if (c.tipo !== 'Ota') continue;
      const a = bd.alimentadores.find((x) => x.id === c.alimentadorId);
      if (!a?.enLinea) continue;
      if (c.estado === 'Pendiente' && ahora - c.creadoEn > 40_000) {
        c.estado = 'Entregado';
        c.entregadoEn = ahora;
      } else if (c.estado === 'Entregado' && c.entregadoEn !== null && ahora - c.entregadoEn > 90_000) {
        c.estado = 'Completado';
        c.completadoEn = ahora;
        const art = bd.artefactos.find((x) => x.id === c.artefactoId);
        if (art?.tipo === 'Firmware') a.versionFirmware = art.version;
        if (art?.tipo === 'Modelo') a.versionModelo = art.version;
      }
    }
  }

  // ---------- Mapeos a DTO ----------

  const usuarioRef = (id: number | null) => {
    const u = bd.usuarios.find((x) => x.id === id);
    return u ? { id: u.id, nombre: u.nombre, email: u.email } : null;
  };

  function duenoDe(a: AlimentadorDemo) {
    // Con varios dueños, el de menor id (igual que el backend).
    const ids = a.miembros.filter((m) => m.rol === 'Dueno').map((m) => m.usuarioId).sort((x, y) => x - y);
    return usuarioRef(ids[0] ?? null);
  }

  function gatewayRef(id: number | null) {
    const g = bd.gateways.find((x) => x.id === id);
    return g ? { id: g.id, deviceId: g.deviceId, enLinea: gatewayEnLinea(g, Date.now()) } : null;
  }

  function aUsuario(u: UsuarioDemo): UsuarioAdminDto {
    return {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      esAdministrador: u.esAdministrador,
      activo: u.activo,
      creadoEn: iso(u.creadoEn)!,
      ultimoAcceso: iso(u.ultimoAcceso),
      alimentadores: bd.alimentadores.filter((a) => a.miembros.some((m) => m.usuarioId === u.id)).length,
      gateways: bd.gateways.filter((g) => g.propietarioId === u.id).length,
    };
  }

  function aAlimentador(a: AlimentadorDemo): AlimentadorAdminDto {
    const g = bd.gateways.find((x) => x.id === a.gatewayId);
    const gwEnLinea = g ? gatewayEnLinea(g, Date.now()) : false;
    return {
      id: a.id,
      codigo: a.codigo,
      nombre: a.nombre,
      zonaHoraria: a.zonaHoraria,
      dueno: duenoDe(a),
      miembros: a.miembros.length,
      mascotas: bd.mascotas.filter((m) => m.alimentadorId === a.id && m.activa).length,
      gateway: gatewayRef(a.gatewayId),
      estado: {
        enLinea: a.enLinea,
        gatewayEnLinea: gwEnLinea,
        nivelTolvaPerroPorcentaje: a.tolvaPerro,
        nivelTolvaGatoPorcentaje: a.tolvaGato,
        pesoPlatoPerroG: a.platoPerro,
        pesoPlatoGatoG: a.platoGato,
        versionFirmware: a.versionFirmware,
        versionModelo: a.versionModelo,
        ultimaSincronizacion: iso(a.ultimoEstado),
        dispensadoRemotoDisponible: a.enLinea && gwEnLinea,
      },
      versionConfiguracion: a.versionConfiguracion,
      creadoEn: iso(a.creadoEn)!,
    };
  }

  function aComando(c: ComandoDemo): ComandoAdminDto {
    const a = bd.alimentadores.find((x) => x.id === c.alimentadorId)!;
    const art = bd.artefactos.find((x) => x.id === c.artefactoId);
    const por = bd.usuarios.find((x) => x.id === c.solicitadoPorId);
    return {
      id: c.id,
      alimentadorId: a.id,
      alimentadorCodigo: a.codigo,
      alimentadorNombre: a.nombre,
      tipo: c.tipo,
      estado: c.estado,
      artefacto: art ? { id: art.id, tipo: art.tipo, version: art.version } : null,
      solicitadoPor: por ? { id: por.id, nombre: por.nombre } : null,
      creadoEn: iso(c.creadoEn)!,
      entregadoEn: iso(c.entregadoEn),
      completadoEn: iso(c.completadoEn),
      gramos: c.gramos,
      dispensadoG: c.dispensadoG,
      error: c.error,
    };
  }

  const aArtefacto = (x: Bd['artefactos'][number]): ArtefactoOtaDto => ({
    id: x.id,
    tipo: x.tipo,
    version: x.version,
    sha256: x.sha256,
    tamanoBytes: x.tamanoBytes,
    creadoEn: iso(x.creadoEn)!,
  });

  function aFoto(f: Bd['fotos'][number]): FotoDudosaAdminDto {
    const a = bd.alimentadores.find((x) => x.id === f.alimentadorId)!;
    return {
      id: f.id,
      alimentadorId: a.id,
      alimentadorCodigo: a.codigo,
      clasePredicha: f.clasePredicha,
      confianza: f.confianza,
      tomadaEn: iso(f.tomadaEn)!,
      subida: f.subida,
      claseRevisada: f.claseRevisada,
      url: f.subida ? `/demo/fotos/${f.id}.svg?sas=${Date.now().toString(36)}` : null,
    };
  }

  // ---------- Utilidades ----------

  function paginar<T>(lista: T[], q: URLSearchParams): Pagina<T> {
    const pagina = Number(q.get('pagina') ?? 1);
    const tamano = Number(q.get('tamano') ?? 25);
    if (!Number.isInteger(pagina) || pagina < 1) throw validacion('Pagina', 'La página debe ser mayor o igual a 1.');
    if (!Number.isInteger(tamano) || tamano < 1 || tamano > 100) throw validacion('Tamano', 'El tamaño debe estar entre 1 y 100.');
    return { elementos: lista.slice((pagina - 1) * tamano, pagina * tamano), total: lista.length, pagina, tamano };
  }

  function enumOpcional<T extends string>(valor: string | null, permitidos: readonly T[], campo: string): T | null {
    if (valor === null || valor === '') return null;
    const encontrado = permitidos.find((p) => p.toLowerCase() === valor.toLowerCase());
    if (!encontrado) {
      // Igual que [ApiController]: título en inglés y errores por campo.
      throw new Problema(400, 'One or more validation errors occurred.', '', { [campo]: [`The value '${valor}' is not valid.`] });
    }
    return encontrado;
  }

  function numeroOpcional(valor: string | null): number | null {
    if (valor === null || valor === '') return null;
    const n = Number(valor);
    return Number.isInteger(n) ? n : null;
  }

  function emitirTokens(u: UsuarioDemo): AuthResponse {
    const accessToken = `demo.${randomBytes(18).toString('base64url')}`;
    const refreshToken = randomBytes(32).toString('base64url');
    const vence = Date.now() + DURACION_ACCESS;
    accesos.set(accessToken, { usuarioId: u.id, vence });
    refrescos.set(refreshToken, u.id);
    u.ultimoAcceso = Date.now();
    return {
      usuarioId: u.id,
      nombre: u.nombre,
      accessToken,
      expiraEn: new Date(vence).toISOString(),
      refreshToken,
      esAdministrador: u.esAdministrador,
    };
  }

  function revocarSesiones(usuarioId: number) {
    for (const [t, id] of refrescos) if (id === usuarioId) refrescos.delete(t);
    for (const [t, v] of accesos) if (v.usuarioId === usuarioId) accesos.delete(t);
  }

  const administradoresActivos = () => bd.usuarios.filter((u) => u.esAdministrador && u.activo);

  function requiereAdmin(p: Peticion): UsuarioDemo {
    if (!p.usuario) throw new Problema(401, 'No autorizado', 'Inicia sesión para continuar.');
    if (!p.usuario.esAdministrador || !p.usuario.activo) {
      throw new Problema(403, 'Acceso denegado', 'Necesitas ser administrador para hacer esto.');
    }
    return p.usuario;
  }

  // ---------- Rutas ----------

  type Manejador = (p: Peticion, params: string[]) => Promise<{ status?: number; json?: unknown }>;
  const rutas: [string, RegExp, Manejador][] = [];
  const ruta = (metodo: string, patron: string, m: Manejador) =>
    rutas.push([metodo, new RegExp(`^${patron.replace(/\{\w+\}/g, '(\\d+)')}$`), m]);

  // Auth
  ruta('POST', '/api/auth/login', async (p) => {
    const { email, password } = (await p.cuerpo()) as { email?: string; password?: string };
    const u = bd.usuarios.find((x) => x.email.toLowerCase() === String(email ?? '').toLowerCase());
    if (!u || u.password !== password) throw new Problema(401, 'No autorizado', 'Correo o contraseña incorrectos.');
    if (!u.activo) throw new Problema(403, 'Acceso denegado', 'Tu cuenta está desactivada. Contacta a un administrador.');
    return { json: emitirTokens(u) };
  });
  ruta('POST', '/api/auth/refresh', async (p) => {
    const { refreshToken } = (await p.cuerpo()) as { refreshToken?: string };
    const id = refrescos.get(String(refreshToken));
    const u = bd.usuarios.find((x) => x.id === id);
    if (!u || !u.activo) throw new Problema(401, 'No autorizado', 'La sesión ya no es válida.');
    refrescos.delete(String(refreshToken)); // rotativo
    return { json: emitirTokens(u) };
  });
  ruta('POST', '/api/auth/logout', async (p) => {
    const { refreshToken } = (await p.cuerpo()) as { refreshToken?: string };
    refrescos.delete(String(refreshToken));
    return { status: 204 };
  });
  ruta('GET', '/api/auth/yo', async (p) => {
    if (!p.usuario) throw new Problema(401, 'No autorizado', 'Inicia sesión para continuar.');
    const u = p.usuario;
    return { json: { id: u.id, nombre: u.nombre, email: u.email, esAdministrador: u.esAdministrador } };
  });

  // Resumen
  ruta('GET', '/api/admin/resumen', async (p) => {
    requiereAdmin(p);
    const ahora = Date.now();
    const conteo = (valores: (string | null)[]): VersionConteo[] => {
      const mapa = new Map<string | null, number>();
      valores.forEach((v) => mapa.set(v, (mapa.get(v) ?? 0) + 1));
      return [...mapa]
        .map(([version, alimentadores]) => ({ version, alimentadores }))
        .sort((x, y) => (x.version === null ? 1 : y.version === null ? -1 : y.alimentadores - x.alimentadores));
    };
    const activos = bd.mascotas.filter((m) => m.activa);
    const r: ResumenAdminDto = {
      usuarios: {
        total: bd.usuarios.length,
        activos: bd.usuarios.filter((u) => u.activo).length,
        administradores: bd.usuarios.filter((u) => u.esAdministrador).length,
        nuevos7Dias: bd.usuarios.filter((u) => ahora - u.creadoEn <= 7 * DIA).length,
      },
      alimentadores: {
        total: bd.alimentadores.length,
        enLinea: bd.alimentadores.filter((a) => a.enLinea).length,
        sinConexion: bd.alimentadores.filter((a) => !a.enLinea && a.gatewayId !== null).length,
        sinGateway: bd.alimentadores.filter((a) => a.gatewayId === null).length,
      },
      gateways: {
        total: bd.gateways.length,
        enLinea: bd.gateways.filter((g) => gatewayEnLinea(g, ahora)).length,
        sinConexion: bd.gateways.filter((g) => !gatewayEnLinea(g, ahora)).length,
        sincronizando: bd.gateways.filter((g) => g.sincronizandoDesde !== null).length,
      },
      mascotas: {
        activas: activos.length,
        perros: activos.filter((m) => m.especie === 'Perro').length,
        gatos: activos.filter((m) => m.especie === 'Gato').length,
      },
      alertas24h: bd.alertas.filter((a) => ahora - a.ocurridaEn <= DIA).length,
      ota: {
        artefactos: bd.artefactos.length,
        enCurso: bd.comandos.filter((c) => c.tipo === 'Ota' && (c.estado === 'Pendiente' || c.estado === 'Entregado')).length,
        fallidas7Dias: bd.comandos.filter(
          (c) =>
            c.tipo === 'Ota' &&
            c.estado === 'Fallido' &&
            c.error !== 'Cancelado por un administrador.' &&
            ahora - c.creadoEn <= 7 * DIA,
        ).length,
      },
      fotosPorRevisar: bd.fotos.filter((f) => f.subida && f.claseRevisada === null).length,
      versionesFirmware: conteo(bd.alimentadores.map((a) => a.versionFirmware)),
      versionesModelo: conteo(bd.alimentadores.map((a) => a.versionModelo)),
    };
    return { json: r };
  });

  // Usuarios
  ruta('GET', '/api/admin/usuarios', async (p) => {
    requiereAdmin(p);
    const buscar = (p.query.get('buscar') ?? '').trim().toLowerCase();
    const lista = bd.usuarios
      .filter((u) => !buscar || u.nombre.toLowerCase().includes(buscar) || u.email.toLowerCase().includes(buscar))
      .sort((x, y) => y.creadoEn - x.creadoEn)
      .map(aUsuario);
    return { json: paginar(lista, p.query) };
  });
  ruta('GET', '/api/admin/usuarios/{id}', async (p, [id]) => {
    requiereAdmin(p);
    const u = bd.usuarios.find((x) => x.id === Number(id));
    if (!u) throw noEncontrado('El usuario no existe.');
    const detalle: UsuarioAdminDetalleDto = {
      ...aUsuario(u),
      membresias: bd.alimentadores
        .flatMap((a) => a.miembros.filter((m) => m.usuarioId === u.id).map((m) => ({ alimentadorId: a.id, codigo: a.codigo, nombre: a.nombre, rol: m.rol }))),
      listaGateways: bd.gateways.filter((g) => g.propietarioId === u.id).map((g) => gatewayRef(g.id)!),
    };
    return { json: detalle };
  });
  ruta('PUT', '/api/admin/usuarios/{id}/administrador', async (p, [id]) => {
    const yo = requiereAdmin(p);
    const { esAdministrador } = (await p.cuerpo()) as { esAdministrador?: boolean };
    const u = bd.usuarios.find((x) => x.id === Number(id));
    if (!u) throw noEncontrado('El usuario no existe.');
    if (!esAdministrador) {
      if (u.id === yo.id) throw regla('No puedes quitarte tu propio rol de administrador.');
      if (u.esAdministrador && u.activo && administradoresActivos().length <= 1) {
        throw regla('No se puede quitar el rol al último administrador activo.');
      }
    }
    u.esAdministrador = Boolean(esAdministrador);
    return { json: aUsuario(u) };
  });
  ruta('PUT', '/api/admin/usuarios/{id}/activo', async (p, [id]) => {
    const yo = requiereAdmin(p);
    const { activo } = (await p.cuerpo()) as { activo?: boolean };
    const u = bd.usuarios.find((x) => x.id === Number(id));
    if (!u) throw noEncontrado('El usuario no existe.');
    if (!activo) {
      if (u.id === yo.id) throw regla('No puedes desactivar tu propia cuenta.');
      if (u.esAdministrador && u.activo && administradoresActivos().length <= 1) {
        throw regla('No se puede desactivar al último administrador activo.');
      }
      revocarSesiones(u.id);
    }
    u.activo = Boolean(activo);
    return { json: aUsuario(u) };
  });

  // Alimentadores
  ruta('GET', '/api/admin/alimentadores', async (p) => {
    requiereAdmin(p);
    const buscar = (p.query.get('buscar') ?? '').trim().toLowerCase();
    const estado = p.query.get('estado') ?? 'todos';
    if (!['todos', 'enlinea', 'sinconexion', 'singateway'].includes(estado.toLowerCase())) {
      throw validacion('Estado', 'El estado debe ser todos, enLinea, sinConexion o sinGateway.');
    }
    const e = estado.toLowerCase();
    const lista = bd.alimentadores
      .filter((a) => {
        const dueno = duenoDe(a);
        const texto = `${a.codigo} ${a.nombre} ${dueno?.email ?? ''}`.toLowerCase();
        if (buscar && !texto.includes(buscar)) return false;
        if (e === 'enlinea') return a.enLinea;
        if (e === 'sinconexion') return !a.enLinea && a.gatewayId !== null;
        if (e === 'singateway') return a.gatewayId === null;
        return true;
      })
      .sort((x, y) => y.creadoEn - x.creadoEn)
      .map(aAlimentador);
    return { json: paginar(lista, p.query) };
  });
  ruta('GET', '/api/admin/alimentadores/{id}', async (p, [id]) => {
    requiereAdmin(p);
    const a = bd.alimentadores.find((x) => x.id === Number(id));
    if (!a) throw noEncontrado('El alimentador no existe.');
    const factor = (kg: number, especie: string) => (especie === 'Perro' ? 70 : 60) * Math.pow(kg, 0.75) * 1.4;
    const detalle: AlimentadorAdminDetalleDto = {
      ...aAlimentador(a),
      kcalPorGramo: a.kcalPorGramo,
      intervaloMinimoHoras: a.intervaloMinimoHoras,
      listaMiembros: a.miembros.map((m) => {
        const u = usuarioRef(m.usuarioId)!;
        return { usuarioId: u.id, nombre: u.nombre, email: u.email, rol: m.rol };
      }),
      listaMascotas: bd.mascotas
        .filter((m) => m.alimentadorId === a.id)
        .map((m) => ({
          id: m.id,
          nombre: m.nombre,
          especie: m.especie,
          tolva: m.especie === 'Perro' ? 1 : 2,
          pesoKg: m.pesoKg,
          edadMeses: m.edadMeses,
          comidasPorDia: m.comidasPorDia,
          etiquetaRfid: m.etiquetaRfid,
          ajustePorcentaje: m.ajustePorcentaje,
          gramosPorDiaRecomendados: Math.round(((factor(m.pesoKg, m.especie) * (1 + m.ajustePorcentaje / 100)) / a.kcalPorGramo) * 10) / 10,
          activa: m.activa,
          ultimaVisita: iso(m.ultimaVisita),
        })),
      horarios: bd.horarios.filter((h) => h.alimentadorId === a.id).map((h) => ({ id: h.id, hora: h.hora, mascotaId: h.mascotaId, activo: h.activo })),
      ultimosComandos: bd.comandos
        .filter((c) => c.alimentadorId === a.id)
        .sort((x, y) => y.creadoEn - x.creadoEn)
        .slice(0, 20)
        .map(aComando),
      ultimasAlertas: bd.alertas
        .filter((al) => al.alimentadorId === a.id)
        .sort((x, y) => y.ocurridaEn - x.ocurridaEn)
        .slice(0, 20)
        .map(
          (al): AlertaDto => ({
            id: al.id,
            alimentadorId: al.alimentadorId,
            mascotaId: al.mascotaId,
            tipo: al.tipo,
            mensaje: al.mensaje,
            ocurridaEn: iso(al.ocurridaEn)!,
            creadaEn: iso(al.ocurridaEn + 20_000)!,
            leida: al.leida,
          }),
        ),
    };
    return { json: detalle };
  });

  // Embebidos
  ruta('GET', '/api/admin/gateways', async (p) => {
    requiereAdmin(p);
    const ahora = Date.now();
    const lista: GatewayAdminDto[] = [...bd.gateways]
      .sort((x, y) => x.deviceId.localeCompare(y.deviceId))
      .map((g) => ({
        id: g.id,
        deviceId: g.deviceId,
        propietario: usuarioRef(g.propietarioId),
        ultimoHeartbeat: iso(g.ultimoHeartbeat),
        enLinea: gatewayEnLinea(g, ahora),
        sinConexionDesde: iso(g.sinConexionDesde),
        sincronizando: g.sincronizandoDesde !== null,
        sincronizandoDesde: iso(g.sincronizandoDesde),
        creadoEn: iso(g.creadoEn)!,
        alimentadores: bd.alimentadores
          .filter((a) => a.gatewayId === g.id)
          .map((a) => ({
            id: a.id,
            codigo: a.codigo,
            nombre: a.nombre,
            enLinea: a.enLinea,
            ultimoEstado: iso(a.ultimoEstado),
            versionFirmware: a.versionFirmware,
            versionModelo: a.versionModelo,
            nivelTolvaPerroPorcentaje: a.tolvaPerro,
            nivelTolvaGatoPorcentaje: a.tolvaGato,
          })),
      }));
    return { json: lista };
  });
  ruta('POST', '/api/admin/gateways/{id}/regenerar-clave', async (p, [id]) => {
    requiereAdmin(p);
    const g = bd.gateways.find((x) => x.id === Number(id));
    if (!g) throw noEncontrado('La Raspberry Pi no existe.');
    return { json: { id: g.id, deviceId: g.deviceId, clave: randomBytes(24).toString('base64url') } };
  });
  ruta('GET', '/api/admin/eventos', async (p) => {
    requiereAdmin(p);
    const alimentadorId = numeroOpcional(p.query.get('alimentadorId'));
    const tipo = enumOpcional(p.query.get('tipo'), ['Jam', 'HopperLow'] as const, 'tipo');
    const lista: EventoAdminDto[] = bd.eventos
      .filter((e) => (alimentadorId === null || e.alimentadorId === alimentadorId) && (tipo === null || e.tipo === tipo))
      .sort((x, y) => y.ocurridoEn - x.ocurridoEn)
      .map((e) => ({
        id: e.id,
        alimentadorId: e.alimentadorId,
        alimentadorCodigo: bd.alimentadores.find((a) => a.id === e.alimentadorId)!.codigo,
        tipo: e.tipo,
        tolva: e.tolva,
        ocurridoEn: iso(e.ocurridoEn)!,
        detalle: e.detalle,
      }));
    return { json: paginar(lista, p.query) };
  });
  ruta('GET', '/api/admin/fotos', async (p) => {
    requiereAdmin(p);
    const estado = (p.query.get('estado') ?? 'pendientes').toLowerCase();
    if (!['pendientes', 'revisadas', 'todas'].includes(estado)) {
      throw validacion('Estado', 'El estado debe ser pendientes, revisadas o todas.');
    }
    const lista = bd.fotos
      .filter((f) =>
        estado === 'pendientes' ? f.subida && f.claseRevisada === null : estado === 'revisadas' ? f.claseRevisada !== null : true,
      )
      .sort((x, y) => y.tomadaEn - x.tomadaEn)
      .map(aFoto);
    return { json: paginar(lista, p.query) };
  });
  ruta('PUT', '/api/admin/fotos/{id}/revision', async (p, [id]) => {
    requiereAdmin(p);
    const { clase } = (await p.cuerpo()) as { clase?: string };
    const f = bd.fotos.find((x) => x.id === Number(id));
    if (!f) throw noEncontrado('La foto no existe.');
    const c = enumOpcional(clase ?? '', ['Perro', 'Gato', 'Paloma', 'Nada'] as const, 'clase');
    if (!c) throw validacion('Clase', 'Indica la clase correcta.');
    if (!f.subida) throw regla('La foto todavía no se ha subido.');
    f.claseRevisada = c as ClaseDetectada;
    return { json: aFoto(f) };
  });

  // OTA (endpoints existentes)
  ruta('GET', '/api/ota/artefactos', async (p) => {
    if (!p.usuario) throw new Problema(401, 'No autorizado', 'Inicia sesión para continuar.');
    return { json: [...bd.artefactos].sort((x, y) => y.creadoEn - x.creadoEn).map(aArtefacto) };
  });
  ruta('POST', '/api/ota/artefactos', async (p) => {
    requiereAdmin(p);
    const cuerpo = await p.crudo();
    if (cuerpo.length > MAX_ARTEFACTO + 1024 * 1024) throw new Problema(413, 'Payload Too Large', 'El archivo es demasiado grande.');
    const form = await new Request('http://demo.local/', {
      method: 'POST',
      headers: { 'content-type': String(p.encabezados['content-type'] ?? '') },
      body: new Uint8Array(cuerpo),
    }).formData();
    const tipoTexto = String(form.get('tipo') ?? '').toLowerCase();
    const version = String(form.get('version') ?? '').trim();
    const archivo = form.get('archivo');
    if (tipoTexto !== 'firmware' && tipoTexto !== 'modelo') throw validacion('Tipo', 'El tipo debe ser firmware o modelo.');
    if (!version) throw validacion('Version', 'Indica la versión.');
    if (!(archivo instanceof Blob) || archivo.size === 0) throw validacion('Archivo', 'Adjunta el archivo.');
    if (archivo.size > MAX_ARTEFACTO) throw validacion('Archivo', 'El archivo supera los 32 MB.');
    const tipo = tipoTexto === 'firmware' ? 'Firmware' : 'Modelo';
    if (bd.artefactos.some((x) => x.tipo === tipo && x.version.toLowerCase() === version.toLowerCase())) {
      throw conflicto(`Ya existe ${tipo === 'Firmware' ? 'el firmware' : 'el modelo'} ${version}.`);
    }
    const bytes = Buffer.from(await archivo.arrayBuffer());
    const nuevo = {
      id: Math.max(0, ...bd.artefactos.map((x) => x.id)) + 1,
      tipo,
      version,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      tamanoBytes: bytes.length,
      creadoEn: Date.now(),
    } as const;
    bd.artefactos.push({ ...nuevo });
    return { status: 201, json: aArtefacto(nuevo) };
  });
  ruta('DELETE', '/api/ota/artefactos/{id}', async (p, [id]) => {
    requiereAdmin(p);
    const i = bd.artefactos.findIndex((x) => x.id === Number(id));
    if (i < 0) throw noEncontrado('El artefacto no existe.');
    if (bd.comandos.some((c) => c.artefactoId === Number(id))) {
      throw conflicto('El artefacto ya se usó en una actualización y no se puede borrar.');
    }
    bd.artefactos.splice(i, 1);
    return { status: 204 };
  });

  // Despliegues
  ruta('POST', '/api/admin/ota/despliegues', async (p) => {
    const yo = requiereAdmin(p);
    const { artefactoId, alimentadorIds, omitirSiYaTieneVersion } = (await p.cuerpo()) as {
      artefactoId?: number;
      alimentadorIds?: number[];
      omitirSiYaTieneVersion?: boolean;
    };
    if (!Array.isArray(alimentadorIds) || alimentadorIds.length < 1 || alimentadorIds.length > 200) {
      throw validacion('AlimentadorIds', 'Indica de 1 a 200 alimentadores.');
    }
    if (new Set(alimentadorIds).size !== alimentadorIds.length) throw validacion('AlimentadorIds', 'Hay alimentadores repetidos.');
    const art = bd.artefactos.find((x) => x.id === artefactoId);
    if (!art) throw noEncontrado('El artefacto no existe.');
    const creados: ComandoAdminDto[] = [];
    const omitidos: { alimentadorId: number; motivo: string }[] = [];
    for (const id of alimentadorIds) {
      const a = bd.alimentadores.find((x) => x.id === id);
      if (!a) {
        omitidos.push({ alimentadorId: id, motivo: 'No existe.' });
        continue;
      }
      if (bd.comandos.some((c) => c.alimentadorId === id && c.tipo === 'Ota' && (c.estado === 'Pendiente' || c.estado === 'Entregado'))) {
        omitidos.push({ alimentadorId: id, motivo: 'Ya tiene una actualización en curso.' });
        continue;
      }
      const actual = art.tipo === 'Firmware' ? a.versionFirmware : a.versionModelo;
      if (omitirSiYaTieneVersion && actual === art.version) {
        omitidos.push({ alimentadorId: id, motivo: 'Ya tiene esa versión.' });
        continue;
      }
      const c: ComandoDemo = {
        id: Math.max(0, ...bd.comandos.map((x) => x.id)) + 1,
        alimentadorId: id,
        tipo: 'Ota',
        estado: 'Pendiente',
        artefactoId: art.id,
        solicitadoPorId: yo.id,
        creadoEn: Date.now(),
        entregadoEn: null,
        completadoEn: null,
        gramos: null,
        dispensadoG: null,
        error: null,
      };
      bd.comandos.push(c);
      creados.push(aComando(c));
    }
    return { json: { creados, omitidos } };
  });
  ruta('GET', '/api/admin/ota/despliegues', async (p) => {
    requiereAdmin(p);
    const estado = enumOpcional(p.query.get('estado'), ['Pendiente', 'Entregado', 'Completado', 'Fallido', 'Vencido'] as const, 'estado');
    const artefactoId = numeroOpcional(p.query.get('artefactoId'));
    const alimentadorId = numeroOpcional(p.query.get('alimentadorId'));
    const lista = bd.comandos
      .filter(
        (c) =>
          c.tipo === 'Ota' &&
          (estado === null || c.estado === estado) &&
          (artefactoId === null || c.artefactoId === artefactoId) &&
          (alimentadorId === null || c.alimentadorId === alimentadorId),
      )
      .sort((x, y) => y.creadoEn - x.creadoEn)
      .map(aComando);
    return { json: paginar(lista, p.query) };
  });
  ruta('POST', '/api/admin/ota/despliegues/{id}/cancelar', async (p, [id]) => {
    requiereAdmin(p);
    const c = bd.comandos.find((x) => x.id === Number(id) && x.tipo === 'Ota');
    if (!c) throw noEncontrado('El despliegue no existe.');
    if (c.estado !== 'Pendiente') throw conflicto('Solo se puede cancelar una actualización pendiente.');
    c.estado = 'Fallido';
    c.error = 'Cancelado por un administrador.';
    c.completadoEn = Date.now();
    return { json: aComando(c) };
  });

  // ---------- Middleware ----------

  async function leerCuerpo(req: IncomingMessage): Promise<Buffer> {
    const partes: Buffer[] = [];
    for await (const parte of req) partes.push(parte as Buffer);
    return Buffer.concat(partes);
  }

  function enviar(res: ServerResponse, status: number, json?: unknown) {
    res.statusCode = status;
    if (json === undefined) {
      res.end();
      return;
    }
    const tipo = status >= 400 ? 'application/problem+json' : 'application/json';
    res.setHeader('Content-Type', `${tipo}; charset=utf-8`);
    res.end(JSON.stringify(json));
  }

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://demo.local');

    const foto = /^\/demo\/fotos\/(\d+)\.svg$/.exec(url.pathname);
    if (foto) {
      const f = bd.fotos.find((x) => x.id === Number(foto[1]));
      if (!f || !f.subida) return enviar(res, 404);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=900');
      const a = bd.alimentadores.find((x) => x.id === f.alimentadorId)!;
      res.end(svgFoto(f.id, f.claseReal, a.codigo, f.tomadaEn));
      return;
    }
    if (!url.pathname.startsWith('/api/')) return next();

    void (async () => {
      let crudo: Buffer | null = null;
      const obtenerCrudo = async () => (crudo ??= await leerCuerpo(req));
      const auth = req.headers.authorization;
      const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
      const acceso = token ? accesos.get(token) : undefined;
      const usuario = acceso && acceso.vence > Date.now() ? (bd.usuarios.find((u) => u.id === acceso.usuarioId) ?? null) : null;

      const p: Peticion = {
        metodo: req.method ?? 'GET',
        ruta: url.pathname,
        query: url.searchParams,
        crudo: obtenerCrudo,
        cuerpo: async () => {
          const b = await obtenerCrudo();
          try {
            return b.length ? JSON.parse(b.toString('utf8')) : {};
          } catch {
            throw validacion('body', 'El cuerpo no es JSON válido.');
          }
        },
        encabezados: req.headers,
        usuario,
      };

      try {
        avanzar();
        // Latencia realista para ver los estados de carga.
        await new Promise((r) => setTimeout(r, 120 + Math.random() * 280));
        for (const [metodo, patron, manejador] of rutas) {
          const m = patron.exec(url.pathname);
          if (m && metodo === p.metodo) {
            const r = await manejador(p, m.slice(1));
            return enviar(res, r.status ?? 200, r.json);
          }
        }
        throw new Problema(404, 'No encontrado', `No existe la ruta ${p.metodo} ${url.pathname} en el modo demo.`);
      } catch (e) {
        if (e instanceof Problema) {
          return enviar(res, e.status, {
            type: `https://tools.ietf.org/html/rfc9110#section-15.${e.status >= 500 ? '6.1' : '5.' + (e.status - 399)}`,
            title: e.titulo,
            status: e.status,
            ...(e.message ? { detail: e.message } : {}),
            ...(e.errores ? { errors: e.errores } : {}),
          });
        }
        console.error('[demo]', e);
        return enviar(res, 500, { title: 'Error interno', status: 500, detail: 'Ocurrió un error inesperado.' });
      }
    })();
  };

  return {
    name: 'alimentador-servidor-demo',
    configureServer(server) {
      server.middlewares.use(middleware);
      server.config.logger.info('  Modo demo: datos falsos en /api (admin@demo.mx / demo1234)');
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

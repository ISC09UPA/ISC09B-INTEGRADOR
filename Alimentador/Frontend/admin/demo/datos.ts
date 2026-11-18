/**
 * Datos falsos del modo demo, en memoria. Se regeneran al reiniciar el servidor de Vite.
 * Las fechas se calculan respecto al momento en que arranca el servidor.
 */
import { createHash } from 'node:crypto';
import type {
  ClaseDetectada,
  EstadoComando,
  Especie,
  RolAlimentador,
  TipoAlerta,
  TipoArtefactoOta,
  TipoComando,
  TipoEvento,
} from '../src/api/types';

export const MIN = 60_000;
export const HORA = 60 * MIN;
export const DIA = 24 * HORA;

// Generador pseudoaleatorio con semilla para que la demo sea igual en cada arranque.
let semilla = 20261117;
export function azar(): number {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
}
export function entre(a: number, b: number): number {
  return a + azar() * (b - a);
}
export function elegir<T>(lista: readonly T[]): T {
  return lista[Math.floor(azar() * lista.length)]!;
}

export interface UsuarioDemo {
  id: number;
  nombre: string;
  email: string;
  password: string;
  esAdministrador: boolean;
  activo: boolean;
  creadoEn: number;
  ultimoAcceso: number | null;
}

export interface GatewayDemo {
  id: number;
  deviceId: string;
  propietarioId: number | null;
  /** Si la Pi "está viva", su heartbeat se refresca solo. */
  viva: boolean;
  ultimoHeartbeat: number | null;
  sinConexionDesde: number | null;
  sincronizandoDesde: number | null;
  creadoEn: number;
}

export interface AlimentadorDemo {
  id: number;
  codigo: string;
  nombre: string;
  zonaHoraria: string;
  gatewayId: number | null;
  miembros: { usuarioId: number; rol: RolAlimentador }[];
  enLinea: boolean;
  ultimoEstado: number | null;
  tolvaPerro: number | null;
  tolvaGato: number | null;
  platoPerro: number | null;
  platoGato: number | null;
  versionFirmware: string | null;
  versionModelo: string | null;
  kcalPorGramo: number;
  intervaloMinimoHoras: number;
  versionConfiguracion: number;
  creadoEn: number;
}

export interface MascotaDemo {
  id: number;
  alimentadorId: number;
  nombre: string;
  especie: Especie;
  pesoKg: number;
  edadMeses: number;
  comidasPorDia: number;
  etiquetaRfid: string | null;
  ajustePorcentaje: number;
  activa: boolean;
  ultimaVisita: number | null;
}

export interface HorarioDemo {
  id: number;
  alimentadorId: number;
  hora: string;
  mascotaId: number | null;
  activo: boolean;
}

export interface AlertaDemo {
  id: number;
  alimentadorId: number;
  mascotaId: number | null;
  tipo: TipoAlerta;
  mensaje: string;
  ocurridaEn: number;
  leida: boolean;
}

export interface EventoDemo {
  id: number;
  alimentadorId: number;
  tipo: TipoEvento;
  tolva: number | null;
  ocurridoEn: number;
  detalle: string | null;
}

export interface FotoDemo {
  id: number;
  alimentadorId: number;
  clasePredicha: ClaseDetectada;
  /** Lo que "realmente" hay en la imagen generada. */
  claseReal: ClaseDetectada;
  confianza: number;
  tomadaEn: number;
  subida: boolean;
  claseRevisada: ClaseDetectada | null;
}

export interface ArtefactoDemo {
  id: number;
  tipo: TipoArtefactoOta;
  version: string;
  sha256: string;
  tamanoBytes: number;
  creadoEn: number;
}

export interface ComandoDemo {
  id: number;
  alimentadorId: number;
  tipo: TipoComando;
  estado: EstadoComando;
  artefactoId: number | null;
  solicitadoPorId: number | null;
  creadoEn: number;
  entregadoEn: number | null;
  completadoEn: number | null;
  gramos: number | null;
  dispensadoG: number | null;
  error: string | null;
}

export interface Bd {
  usuarios: UsuarioDemo[];
  gateways: GatewayDemo[];
  alimentadores: AlimentadorDemo[];
  mascotas: MascotaDemo[];
  horarios: HorarioDemo[];
  alertas: AlertaDemo[];
  eventos: EventoDemo[];
  fotos: FotoDemo[];
  artefactos: ArtefactoDemo[];
  comandos: ComandoDemo[];
}

function sha(texto: string): string {
  return createHash('sha256').update(texto).digest('hex');
}

export function crearBd(): Bd {
  const ahora = Date.now();
  const hace = (ms: number) => ahora - ms;

  const usuarios: UsuarioDemo[] = [
    { id: 1, nombre: 'Administración Demo', email: 'admin@demo.mx', password: 'demo1234', esAdministrador: true, activo: true, creadoEn: hace(60 * DIA), ultimoAcceso: hace(3 * MIN) },
    { id: 2, nombre: 'Mariana López Ortiz', email: 'mariana.lopez@demo.mx', password: 'demo1234', esAdministrador: true, activo: true, creadoEn: hace(55 * DIA), ultimoAcceso: hace(2 * DIA) },
    { id: 3, nombre: 'Ana Ramírez', email: 'ana@demo.mx', password: 'demo1234', esAdministrador: false, activo: true, creadoEn: hace(30 * DIA), ultimoAcceso: hace(5 * HORA) },
    { id: 4, nombre: 'Carlos Hernández Ruiz', email: 'carlos.hernandez@demo.mx', password: 'demo1234', esAdministrador: false, activo: true, creadoEn: hace(28 * DIA), ultimoAcceso: hace(26 * HORA) },
    { id: 5, nombre: 'Lucía Martínez', email: 'lucia.martinez@demo.mx', password: 'demo1234', esAdministrador: false, activo: true, creadoEn: hace(20 * DIA), ultimoAcceso: hace(40 * MIN) },
    { id: 6, nombre: 'Jorge Delgado', email: 'jorge.delgado@demo.mx', password: 'demo1234', esAdministrador: false, activo: false, creadoEn: hace(18 * DIA), ultimoAcceso: hace(12 * DIA) },
    { id: 7, nombre: 'Sofía Guerrero Peña', email: 'sofia.guerrero@demo.mx', password: 'demo1234', esAdministrador: false, activo: true, creadoEn: hace(9 * DIA), ultimoAcceso: hace(3 * DIA) },
    { id: 8, nombre: 'Ricardo Salinas', email: 'ricardo.salinas@demo.mx', password: 'demo1234', esAdministrador: false, activo: true, creadoEn: hace(5 * DIA), ultimoAcceso: hace(9 * HORA) },
    { id: 9, nombre: 'Fernanda Castillo', email: 'fernanda.castillo@demo.mx', password: 'demo1234', esAdministrador: false, activo: true, creadoEn: hace(3 * DIA), ultimoAcceso: null },
    { id: 10, nombre: 'Héctor Navarro', email: 'hector.navarro@demo.mx', password: 'demo1234', esAdministrador: false, activo: true, creadoEn: hace(1 * DIA), ultimoAcceso: hace(20 * HORA) },
    { id: 11, nombre: 'Valeria Ibarra', email: 'valeria.ibarra@demo.mx', password: 'demo1234', esAdministrador: false, activo: true, creadoEn: hace(10 * HORA), ultimoAcceso: hace(10 * HORA) },
  ];
  // Más usuarios para que la tabla tenga varias páginas.
  const nombres = ['Daniela', 'Miguel', 'Paola', 'Andrés', 'Regina', 'Emilio', 'Ximena', 'Rodrigo', 'Camila', 'Diego', 'Renata', 'Iván', 'Natalia', 'Pablo', 'Mónica', 'Óscar', 'Elena', 'Tomás', 'Brenda', 'Arturo'];
  const apellidos = ['Gómez', 'Flores', 'Vázquez', 'Moreno', 'Jiménez', 'Romero', 'Torres', 'Cruz', 'Reyes', 'Mendoza'];
  nombres.forEach((n, i) => {
    const ap = apellidos[i % apellidos.length]!;
    usuarios.push({
      id: 12 + i,
      nombre: `${n} ${ap}`,
      email: `${n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}.${ap.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}@demo.mx`,
      password: 'demo1234',
      esAdministrador: false,
      activo: i % 9 !== 4,
      creadoEn: hace((40 - i) * DIA),
      ultimoAcceso: i % 4 === 3 ? null : hace(Math.round(entre(1, 200)) * HORA),
    });
  });

  const gateways: GatewayDemo[] = [
    { id: 1, deviceId: 'pi-casa-lopez', propietarioId: 2, viva: true, ultimoHeartbeat: hace(2 * MIN), sinConexionDesde: null, sincronizandoDesde: null, creadoEn: hace(54 * DIA) },
    { id: 2, deviceId: 'pi-depto-ramirez', propietarioId: 3, viva: true, ultimoHeartbeat: hace(4 * MIN), sinConexionDesde: null, sincronizandoDesde: hace(6 * MIN), creadoEn: hace(29 * DIA) },
    { id: 3, deviceId: 'pi-taller-hernandez', propietarioId: 4, viva: false, ultimoHeartbeat: hace(3 * HORA + 12 * MIN), sinConexionDesde: hace(3 * HORA), sincronizandoDesde: null, creadoEn: hace(27 * DIA) },
  ];

  const a = (p: Omit<AlimentadorDemo, 'zonaHoraria' | 'kcalPorGramo' | 'intervaloMinimoHoras'> & Partial<AlimentadorDemo>): AlimentadorDemo => ({
    zonaHoraria: 'America/Mexico_City',
    kcalPorGramo: 3.6,
    intervaloMinimoHoras: 3,
    ...p,
  });
  const alimentadores: AlimentadorDemo[] = [
    a({ id: 1, codigo: 'feeder01', nombre: 'Cocina', gatewayId: 1, miembros: [{ usuarioId: 2, rol: 'Dueno' }, { usuarioId: 5, rol: 'Cuidador' }], enLinea: true, ultimoEstado: hace(2 * MIN), tolvaPerro: 64, tolvaGato: 18, platoPerro: 12.4, platoGato: 3.1, versionFirmware: '1.3.0', versionModelo: 'm-2026-11-01', versionConfiguracion: 7, creadoEn: hace(53 * DIA) }),
    a({ id: 2, codigo: 'feeder02', nombre: 'Patio', gatewayId: 1, miembros: [{ usuarioId: 2, rol: 'Dueno' }], enLinea: true, ultimoEstado: hace(2 * MIN), tolvaPerro: 82, tolvaGato: 71, platoPerro: 0, platoGato: 22.8, versionFirmware: '1.2.0', versionModelo: 'm-2026-11-01', kcalPorGramo: 3.4, versionConfiguracion: 4, creadoEn: hace(40 * DIA) }),
    a({ id: 3, codigo: 'feeder03', nombre: 'Sala del depa', gatewayId: 2, miembros: [{ usuarioId: 3, rol: 'Dueno' }, { usuarioId: 7, rol: 'Dueno' }, { usuarioId: 8, rol: 'Cuidador' }], enLinea: true, ultimoEstado: hace(4 * MIN), tolvaPerro: null, tolvaGato: 45, platoPerro: null, platoGato: 8.5, versionFirmware: '1.2.0', versionModelo: 'm-2026-10-12', intervaloMinimoHoras: 4, versionConfiguracion: 12, creadoEn: hace(28 * DIA) }),
    a({ id: 4, codigo: 'feeder04', nombre: 'Taller', gatewayId: 3, miembros: [{ usuarioId: 4, rol: 'Dueno' }], enLinea: false, ultimoEstado: hace(3 * HORA + 15 * MIN), tolvaPerro: 9, tolvaGato: 33, platoPerro: 0, platoGato: 0, versionFirmware: '1.1.4', versionModelo: 'm-2026-10-12', zonaHoraria: 'America/Monterrey', versionConfiguracion: 3, creadoEn: hace(26 * DIA) }),
    a({ id: 5, codigo: 'feeder05', nombre: 'Bodega', gatewayId: 3, miembros: [{ usuarioId: 4, rol: 'Dueno' }, { usuarioId: 10, rol: 'Cuidador' }], enLinea: false, ultimoEstado: hace(3 * HORA + 15 * MIN), tolvaPerro: 51, tolvaGato: null, platoPerro: 40.2, platoGato: null, versionFirmware: '1.2.0', versionModelo: null, zonaHoraria: 'America/Monterrey', versionConfiguracion: 2, creadoEn: hace(20 * DIA) }),
    a({ id: 6, codigo: 'feeder06', nombre: 'Casa nueva', gatewayId: null, miembros: [{ usuarioId: 9, rol: 'Dueno' }], enLinea: false, ultimoEstado: null, tolvaPerro: null, tolvaGato: null, platoPerro: null, platoGato: null, versionFirmware: null, versionModelo: null, versionConfiguracion: 1, creadoEn: hace(2 * DIA) }),
  ];

  let idMascota = 1;
  const m = (alimentadorId: number, nombre: string, especie: Especie, pesoKg: number, edadMeses: number, extra: Partial<MascotaDemo> = {}): MascotaDemo => ({
    id: idMascota++,
    alimentadorId,
    nombre,
    especie,
    pesoKg,
    edadMeses,
    comidasPorDia: especie === 'Perro' ? 2 : 3,
    etiquetaRfid: null,
    ajustePorcentaje: 0,
    activa: true,
    ultimaVisita: hace(Math.round(entre(20, 400)) * MIN),
    ...extra,
  });
  const mascotas: MascotaDemo[] = [
    m(1, 'Firulais', 'Perro', 18.5, 48, { etiquetaRfid: 'E200-3412-0A1B', ajustePorcentaje: -5 }),
    m(1, 'Michi', 'Gato', 4.2, 36, { ajustePorcentaje: 5 }),
    m(2, 'Canela', 'Perro', 9.8, 14),
    m(2, 'Nube', 'Gato', 3.6, 20, { etiquetaRfid: 'E200-3412-0C77' }),
    m(2, 'Pelusa', 'Gato', 5.1, 110, { activa: false, ultimaVisita: hace(35 * DIA) }),
    m(3, 'Luna', 'Gato', 3.9, 60, { ajustePorcentaje: -10 }),
    m(4, 'Rocky', 'Perro', 32.0, 72, { ultimaVisita: hace(4 * HORA) }),
    m(4, 'Tigre', 'Gato', 4.8, 40, { ultimaVisita: hace(5 * HORA) }),
    m(5, 'Max', 'Perro', 24.3, 30, { comidasPorDia: 3, ultimaVisita: hace(3 * HORA + 40 * MIN) }),
    m(5, 'Bolita', 'Perro', 6.1, 8, { activa: false, ultimaVisita: hace(18 * DIA) }),
  ];

  let idHorario = 1;
  const horarios: HorarioDemo[] = [
    { id: idHorario++, alimentadorId: 1, hora: '08:00', mascotaId: 1, activo: true },
    { id: idHorario++, alimentadorId: 1, hora: '19:30', mascotaId: 1, activo: true },
    { id: idHorario++, alimentadorId: 1, hora: '07:00', mascotaId: 2, activo: true },
    { id: idHorario++, alimentadorId: 2, hora: '09:00', mascotaId: null, activo: true },
    { id: idHorario++, alimentadorId: 2, hora: '21:00', mascotaId: null, activo: false },
    { id: idHorario++, alimentadorId: 3, hora: '06:30', mascotaId: 6, activo: true },
    { id: idHorario++, alimentadorId: 4, hora: '08:30', mascotaId: 7, activo: true },
    { id: idHorario++, alimentadorId: 5, hora: '12:00', mascotaId: 9, activo: true },
  ];

  let idAlerta = 1;
  const alertas: AlertaDemo[] = [
    { id: idAlerta++, alimentadorId: 1, mascotaId: null, tipo: 'TolvaBaja', mensaje: 'La tolva del gato está por debajo del 20 %.', ocurridaEn: hace(50 * MIN), leida: false },
    { id: idAlerta++, alimentadorId: 4, mascotaId: null, tipo: 'GatewaySinConexion', mensaje: 'La Raspberry Pi pi-taller-hernandez lleva 30 min sin reportar.', ocurridaEn: hace(2 * HORA + 30 * MIN), leida: false },
    { id: idAlerta++, alimentadorId: 4, mascotaId: null, tipo: 'AlimentadorSinConexion', mensaje: 'Taller lleva 30 min sin reportar.', ocurridaEn: hace(2 * HORA + 30 * MIN), leida: false },
    { id: idAlerta++, alimentadorId: 5, mascotaId: null, tipo: 'AlimentadorSinConexion', mensaje: 'Bodega lleva 30 min sin reportar.', ocurridaEn: hace(2 * HORA + 30 * MIN), leida: true },
    { id: idAlerta++, alimentadorId: 4, mascotaId: null, tipo: 'Atasco', mensaje: 'Se atascó el dispensador del perro.', ocurridaEn: hace(5 * HORA), leida: true },
    { id: idAlerta++, alimentadorId: 3, mascotaId: 6, tipo: 'BajaApetito', mensaje: 'Luna comió 35 % menos que su promedio.', ocurridaEn: hace(9 * HORA), leida: false },
    { id: idAlerta++, alimentadorId: 2, mascotaId: 3, tipo: 'NoHaComido', mensaje: 'Canela no ha comido en 12 horas.', ocurridaEn: hace(20 * HORA), leida: true },
    { id: idAlerta++, alimentadorId: 1, mascotaId: null, tipo: 'ConexionRestablecida', mensaje: 'Cocina volvió a reportar.', ocurridaEn: hace(3 * DIA), leida: true },
  ];

  const eventos: EventoDemo[] = [];
  let idEvento = 1;
  for (let i = 0; i < 46; i++) {
    const alimentadorId = elegir([1, 1, 2, 3, 4, 4, 5]);
    const tipo: TipoEvento = azar() < 0.4 ? 'Jam' : 'HopperLow';
    const tolva = alimentadorId === 3 ? 2 : alimentadorId === 5 ? 1 : azar() < 0.5 ? 1 : 2;
    eventos.push({
      id: idEvento++,
      alimentadorId,
      tipo,
      tolva: i === 7 ? null : tolva,
      ocurridoEn: hace(Math.round(entre(5, 60 * 24 * 9)) * MIN),
      detalle: tipo === 'Jam' ? elegir(['Motor detenido tras 3 intentos', 'Croquetas apelmazadas', null]) : elegir(['Nivel 18 %', 'Nivel 12 %', 'Nivel 9 %', null]),
    });
  }

  const fotos: FotoDemo[] = [];
  const clases: ClaseDetectada[] = ['Perro', 'Gato', 'Paloma', 'Nada'];
  for (let i = 1; i <= 34; i++) {
    const claseReal = elegir(clases);
    const confunde = azar() < 0.55;
    const clasePredicha = confunde ? elegir(clases.filter((c) => c !== claseReal)) : claseReal;
    const revisada = i > 20 ? claseReal : null;
    fotos.push({
      id: i,
      alimentadorId: elegir([1, 2, 3, 4, 5]),
      clasePredicha,
      claseReal,
      confianza: Math.round(entre(0.31, 0.69) * 100) / 100,
      tomadaEn: hace(Math.round(entre(10, 60 * 24 * 6)) * MIN),
      subida: i !== 3 && i !== 11,
      claseRevisada: revisada,
    });
  }

  const art = (id: number, tipo: TipoArtefactoOta, version: string, tamanoBytes: number, dias: number): ArtefactoDemo => ({
    id,
    tipo,
    version,
    sha256: sha(`${tipo}-${version}`),
    tamanoBytes,
    creadoEn: hace(dias * DIA),
  });
  const artefactos: ArtefactoDemo[] = [
    art(1, 'Firmware', '1.1.4', 1_183_744, 40),
    art(2, 'Firmware', '1.2.0', 1_241_088, 21),
    art(3, 'Modelo', 'm-2026-10-12', 6_815_744, 35),
    art(4, 'Modelo', 'm-2026-11-01', 7_012_352, 16),
    art(5, 'Firmware', '1.3.0', 1_298_432, 6),
    art(6, 'Firmware', '1.3.1-rc1', 1_301_504, 0.2),
  ];

  let idComando = 1;
  const c = (p: Partial<ComandoDemo> & Pick<ComandoDemo, 'alimentadorId' | 'tipo' | 'estado' | 'creadoEn'>): ComandoDemo => ({
    id: idComando++,
    artefactoId: null,
    solicitadoPorId: 1,
    entregadoEn: null,
    completadoEn: null,
    gramos: null,
    dispensadoG: null,
    error: null,
    ...p,
  });
  const comandos: ComandoDemo[] = [
    c({ alimentadorId: 1, tipo: 'Ota', estado: 'Completado', artefactoId: 2, creadoEn: hace(20 * DIA), entregadoEn: hace(20 * DIA - 2 * MIN), completadoEn: hace(20 * DIA - 6 * MIN), solicitadoPorId: 2 }),
    c({ alimentadorId: 2, tipo: 'Ota', estado: 'Completado', artefactoId: 2, creadoEn: hace(20 * DIA), entregadoEn: hace(20 * DIA - 2 * MIN), completadoEn: hace(20 * DIA - 7 * MIN), solicitadoPorId: 2 }),
    c({ alimentadorId: 1, tipo: 'Ota', estado: 'Completado', artefactoId: 4, creadoEn: hace(15 * DIA), entregadoEn: hace(15 * DIA - MIN), completadoEn: hace(15 * DIA - 9 * MIN) }),
    c({ alimentadorId: 2, tipo: 'Ota', estado: 'Completado', artefactoId: 4, creadoEn: hace(15 * DIA), entregadoEn: hace(15 * DIA - MIN), completadoEn: hace(15 * DIA - 10 * MIN) }),
    c({ alimentadorId: 4, tipo: 'Ota', estado: 'Fallido', artefactoId: 2, creadoEn: hace(5 * DIA), entregadoEn: hace(5 * DIA - MIN), completadoEn: hace(5 * DIA - 4 * MIN), error: 'SHA-256 no coincide; se conservó la versión anterior.' }),
    c({ alimentadorId: 3, tipo: 'Ota', estado: 'Vencido', artefactoId: 5, creadoEn: hace(4 * DIA), entregadoEn: hace(4 * DIA - MIN), completadoEn: hace(4 * DIA - 31 * MIN), error: 'Sin respuesta en 30 min.' }),
    c({ alimentadorId: 1, tipo: 'Ota', estado: 'Completado', artefactoId: 5, creadoEn: hace(4 * DIA), entregadoEn: hace(4 * DIA - MIN), completadoEn: hace(4 * DIA - 5 * MIN) }),
    c({ alimentadorId: 5, tipo: 'Ota', estado: 'Fallido', artefactoId: 5, creadoEn: hace(2 * DIA), error: 'Cancelado por un administrador.', completadoEn: hace(2 * DIA - 20 * MIN), solicitadoPorId: 2 }),
    c({ alimentadorId: 4, tipo: 'Ota', estado: 'Pendiente', artefactoId: 5, creadoEn: hace(3 * HORA + 30 * MIN) }),
    c({ alimentadorId: 5, tipo: 'Ota', estado: 'Pendiente', artefactoId: 4, creadoEn: hace(3 * HORA + 25 * MIN) }),
    c({ alimentadorId: 3, tipo: 'Ota', estado: 'Entregado', artefactoId: 5, creadoEn: hace(2 * MIN), entregadoEn: hace(20_000) }),
    c({ alimentadorId: 1, tipo: 'Dispensar', estado: 'Completado', creadoEn: hace(5 * HORA), completadoEn: hace(5 * HORA - MIN), gramos: 40, dispensadoG: 38.6, solicitadoPorId: 2 }),
    c({ alimentadorId: 2, tipo: 'Dispensar', estado: 'Vencido', creadoEn: hace(26 * HORA), completadoEn: hace(26 * HORA - 2 * MIN), gramos: 25, error: 'La Raspberry Pi no lo recogió a tiempo.', solicitadoPorId: 2 }),
    c({ alimentadorId: 3, tipo: 'Dispensar', estado: 'Completado', creadoEn: hace(2 * HORA), completadoEn: hace(2 * HORA - MIN), gramos: 15, dispensadoG: 15.2, solicitadoPorId: 3 }),
  ];

  return { usuarios, gateways, alimentadores, mascotas, horarios, alertas, eventos, fotos, artefactos, comandos };
}

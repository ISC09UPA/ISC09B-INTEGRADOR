import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { API_URL, obtenerAccessToken } from './client';
import type { AlertaDto, ComandoDto, EstadoAlimentadorEvento, VisitaDto } from './types';

export interface EventosHub {
  VisitaRegistrada: VisitaDto;
  AlertaCreada: AlertaDto;
  ComandoActualizado: ComandoDto;
  EstadoAlimentador: EstadoAlimentadorEvento;
}
export type NombreEvento = keyof EventosHub;

const EVENTOS: NombreEvento[] = ['VisitaRegistrada', 'AlertaCreada', 'ComandoActualizado', 'EstadoAlimentador'];

type Oyente<E extends NombreEvento> = (datos: EventosHub[E]) => void;

/**
 * Conexión única al hub /hubs/alimentador. El token viaja en ?access_token=
 * (accessTokenFactory lo agrega) y se pide de nuevo en cada reconexión.
 */
class TiempoReal {
  private conexion: HubConnection | null = null;
  private iniciando: Promise<void> | null = null;
  private grupos = new Set<number>();
  private oyentes = new Map<NombreEvento, Set<(datos: unknown) => void>>();
  private oyentesEstado = new Set<(conectado: boolean) => void>();

  get conectado(): boolean {
    return this.conexion?.state === HubConnectionState.Connected;
  }

  on<E extends NombreEvento>(evento: E, fn: Oyente<E>): () => void {
    let set = this.oyentes.get(evento);
    if (!set) {
      set = new Set();
      this.oyentes.set(evento, set);
    }
    const envuelto = fn as (datos: unknown) => void;
    set.add(envuelto);
    return () => set.delete(envuelto);
  }

  onEstadoConexion(fn: (conectado: boolean) => void): () => void {
    this.oyentesEstado.add(fn);
    return () => this.oyentesEstado.delete(fn);
  }

  private avisarEstado() {
    const c = this.conectado;
    this.oyentesEstado.forEach((fn) => fn(c));
  }

  private crear(): HubConnection {
    const conexion = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/alimentador`, { accessTokenFactory: () => obtenerAccessToken() })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    for (const evento of EVENTOS) {
      conexion.on(evento, (datos: unknown) => {
        this.oyentes.get(evento)?.forEach((fn) => fn(datos));
      });
    }

    conexion.onreconnecting(() => this.avisarEstado());
    conexion.onreconnected(async () => {
      // Los grupos se pierden al reconectar; hay que volver a unirse.
      await this.reunirse();
      this.avisarEstado();
    });
    conexion.onclose(() => this.avisarEstado());
    return conexion;
  }

  private async reunirse() {
    for (const id of this.grupos) {
      try {
        await this.conexion?.invoke('UnirseAlimentador', id);
      } catch {
        this.grupos.delete(id);
      }
    }
  }

  async iniciar(): Promise<void> {
    if (!this.conexion) this.conexion = this.crear();
    if (this.conexion.state === HubConnectionState.Connected) return;
    if (this.iniciando) return this.iniciando;
    if (this.conexion.state !== HubConnectionState.Disconnected) return;

    this.iniciando = this.conexion
      .start()
      .then(() => this.reunirse())
      .finally(() => {
        this.iniciando = null;
        this.avisarEstado();
      });
    return this.iniciando;
  }

  async unirse(alimentadorId: number): Promise<void> {
    this.grupos.add(alimentadorId);
    await this.iniciar();
    if (this.conectado) await this.conexion?.invoke('UnirseAlimentador', alimentadorId);
  }

  async salir(alimentadorId: number): Promise<void> {
    this.grupos.delete(alimentadorId);
    if (this.conectado) await this.conexion?.invoke('SalirAlimentador', alimentadorId).catch(() => undefined);
  }

  async detener(): Promise<void> {
    this.grupos.clear();
    const c = this.conexion;
    this.conexion = null;
    if (c) await c.stop().catch(() => undefined);
    this.avisarEstado();
  }
}

export const tiempoReal = new TiempoReal();

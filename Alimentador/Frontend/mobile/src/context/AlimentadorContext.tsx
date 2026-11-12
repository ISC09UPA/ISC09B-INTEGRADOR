import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { alertasApi, alimentadoresApi, horariosApi, mascotasApi } from '@/api/endpoints';
import { tiempoReal } from '@/api/realtime';
import type { AlertaDto, AlimentadorDto, ComandoDto, HorarioDto, MascotaDto, VisitaDto } from '@/api/types';
import {
  alertaVisible,
  guardarExtras,
  guardarPreferenciasAlertas,
  guardarSeleccion,
  leerExtras,
  leerPreferenciasAlertas,
  leerSeleccion,
  PREFERENCIAS_ALERTAS_INICIALES,
  type ExtrasMascota,
  type PreferenciasAlertas,
} from '@/storage/preferencias';

import { useAuth } from './AuthContext';

interface AlimentadorValor {
  cargando: boolean;
  error: string | null;
  tiempoRealConectado: boolean;

  alimentadores: AlimentadorDto[];
  alimentador: AlimentadorDto | null;
  esDueno: boolean;
  seleccionarAlimentador: (id: number) => void;

  mascotas: MascotaDto[];
  mascota: MascotaDto | null;
  seleccionarMascota: (id: number) => void;
  extras: Record<string, ExtrasMascota>;
  guardarExtrasMascota: (mascotaId: number, extras: ExtrasMascota) => Promise<void>;

  horarios: HorarioDto[];
  comandos: ComandoDto[];
  alertas: AlertaDto[];
  noLeidas: number;
  marcarLeida: (id: number) => Promise<void>;
  preferenciasAlertas: PreferenciasAlertas;
  guardarPreferencias: (p: PreferenciasAlertas) => Promise<void>;

  /** Última visita recibida por SignalR; sirve para recargar historiales. */
  ultimaVisita: VisitaDto | null;

  recargar: () => Promise<void>;
  recargarAlimentadores: () => Promise<AlimentadorDto[]>;
  recargarMascotas: () => Promise<void>;
  recargarHorarios: () => Promise<void>;
  recargarComandos: () => Promise<void>;
  registrarComando: (c: ComandoDto) => void;
}

const AlimentadorContext = createContext<AlimentadorValor | null>(null);

function upsert<T extends { id: number }>(lista: T[], item: T): T[] {
  const i = lista.findIndex((x) => x.id === item.id);
  if (i < 0) return [item, ...lista];
  const copia = lista.slice();
  copia[i] = item;
  return copia;
}

export function AlimentadorProvider({ children }: { children: ReactNode }) {
  const { estado } = useAuth();
  const autenticado = estado === 'autenticado';

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiempoRealConectado, setTiempoRealConectado] = useState(false);

  const [alimentadores, setAlimentadores] = useState<AlimentadorDto[]>([]);
  const [alimentadorId, setAlimentadorId] = useState<number | null>(null);
  const [mascotas, setMascotas] = useState<MascotaDto[]>([]);
  const [mascotaId, setMascotaId] = useState<number | null>(null);
  const [extras, setExtras] = useState<Record<string, ExtrasMascota>>({});
  const [horarios, setHorarios] = useState<HorarioDto[]>([]);
  const [comandos, setComandos] = useState<ComandoDto[]>([]);
  const [todasAlertas, setTodasAlertas] = useState<AlertaDto[]>([]);
  const [preferenciasAlertas, setPreferencias] = useState<PreferenciasAlertas>(PREFERENCIAS_ALERTAS_INICIALES);
  const [ultimaVisita, setUltimaVisita] = useState<VisitaDto | null>(null);

  // Copias en refs para leer la selección actual dentro de callbacks estables.
  const alimentadorIdRef = useRef<number | null>(null);
  const mascotaIdRef = useRef<number | null>(null);
  useEffect(() => {
    alimentadorIdRef.current = alimentadorId;
  }, [alimentadorId]);
  useEffect(() => {
    mascotaIdRef.current = mascotaId;
  }, [mascotaId]);

  const alimentador = alimentadores.find((a) => a.id === alimentadorId) ?? null;
  const mascota = mascotas.find((m) => m.id === mascotaId) ?? mascotas[0] ?? null;

  const recargarAlimentadores = useCallback(async () => {
    const lista = await alimentadoresApi.listar();
    setAlimentadores(lista);
    const guardada = await leerSeleccion();
    const actual = alimentadorIdRef.current ?? guardada.alimentadorId ?? null;
    const elegido = lista.find((a) => a.id === actual)?.id ?? lista[0]?.id ?? null;
    alimentadorIdRef.current = elegido;
    setAlimentadorId(elegido);
    if (mascotaIdRef.current === null && guardada.mascotaId) setMascotaId(guardada.mascotaId);
    return lista;
  }, []);

  const cargarDatosAlimentador = useCallback(async (id: number) => {
    const [m, h, a, c] = await Promise.all([
      mascotasApi.listar(id),
      horariosApi.listar(id),
      alertasApi.listar(id),
      alimentadoresApi.comandos(id),
    ]);
    if (alimentadorIdRef.current !== id) return;
    setMascotas(m);
    setHorarios(h);
    setTodasAlertas(a);
    setComandos(c);
    setMascotaId((prev) => (prev !== null && m.some((x) => x.id === prev) ? prev : (m[0]?.id ?? null)));
  }, []);

  const recargar = useCallback(async () => {
    setError(null);
    try {
      const lista = await recargarAlimentadores();
      const id = alimentadorIdRef.current ?? lista[0]?.id;
      if (id) await cargarDatosAlimentador(id);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [recargarAlimentadores, cargarDatosAlimentador]);

  // Carga inicial y limpieza al cerrar sesión.
  useEffect(() => {
    if (!autenticado) {
      setAlimentadores([]);
      setAlimentadorId(null);
      setMascotas([]);
      setMascotaId(null);
      setHorarios([]);
      setComandos([]);
      setTodasAlertas([]);
      setCargando(false);
      return;
    }
    let vivo = true;
    setCargando(true);
    Promise.all([leerExtras(), leerPreferenciasAlertas()]).then(([e, p]) => {
      if (!vivo) return;
      setExtras(e);
      setPreferencias(p);
    });
    recargarAlimentadores()
      .catch((e) => vivo && setError((e as Error).message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [autenticado, recargarAlimentadores]);

  // Al cambiar de alimentador: datos y grupo de SignalR.
  useEffect(() => {
    if (!autenticado || alimentadorId === null) return;
    let vivo = true;
    setCargando(true);
    cargarDatosAlimentador(alimentadorId)
      .catch((e) => vivo && setError((e as Error).message))
      .finally(() => vivo && setCargando(false));

    tiempoReal.unirse(alimentadorId).catch(() => undefined);
    return () => {
      vivo = false;
      tiempoReal.salir(alimentadorId).catch(() => undefined);
    };
  }, [autenticado, alimentadorId, cargarDatosAlimentador]);

  // Eventos en tiempo real.
  useEffect(() => {
    if (!autenticado) return;
    const quitar = [
      tiempoReal.onEstadoConexion(setTiempoRealConectado),
      tiempoReal.on('EstadoAlimentador', ({ alimentadorId: id, estado: nuevo }) => {
        setAlimentadores((lista) => lista.map((a) => (a.id === id ? { ...a, estado: nuevo } : a)));
      }),
      tiempoReal.on('AlertaCreada', (alerta) => {
        if (alerta.alimentadorId === alimentadorIdRef.current) setTodasAlertas((l) => upsert(l, alerta));
      }),
      tiempoReal.on('ComandoActualizado', (comando) => {
        if (comando.alimentadorId === alimentadorIdRef.current) setComandos((l) => upsert(l, comando));
      }),
      tiempoReal.on('VisitaRegistrada', (visita) => setUltimaVisita(visita)),
    ];
    return () => quitar.forEach((q) => q());
  }, [autenticado]);

  const seleccionarAlimentador = useCallback((id: number) => {
    alimentadorIdRef.current = id;
    setAlimentadorId(id);
    setMascotaId(null);
    guardarSeleccion({ alimentadorId: id });
  }, []);

  const seleccionarMascota = useCallback((id: number) => {
    setMascotaId(id);
    guardarSeleccion({ alimentadorId: alimentadorIdRef.current ?? undefined, mascotaId: id });
  }, []);

  const guardarExtrasMascota = useCallback(async (id: number, e: ExtrasMascota) => {
    setExtras(await guardarExtras(id, e));
  }, []);

  const recargarMascotas = useCallback(async () => {
    const id = alimentadorIdRef.current;
    if (id) setMascotas(await mascotasApi.listar(id));
  }, []);

  const recargarHorarios = useCallback(async () => {
    const id = alimentadorIdRef.current;
    if (id) setHorarios(await horariosApi.listar(id));
  }, []);

  const recargarComandos = useCallback(async () => {
    const id = alimentadorIdRef.current;
    if (id) setComandos(await alimentadoresApi.comandos(id));
  }, []);

  const registrarComando = useCallback((c: ComandoDto) => setComandos((l) => upsert(l, c)), []);

  const marcarLeida = useCallback(async (id: number) => {
    await alertasApi.marcarLeida(id);
    setTodasAlertas((l) => l.map((a) => (a.id === id ? { ...a, leida: true } : a)));
  }, []);

  const guardarPreferencias = useCallback(async (p: PreferenciasAlertas) => {
    setPreferencias(p);
    await guardarPreferenciasAlertas(p);
  }, []);

  const alertas = useMemo(
    () =>
      todasAlertas
        .filter((a) => alertaVisible(a.tipo, preferenciasAlertas))
        .sort((a, b) => Date.parse(b.ocurridaEn) - Date.parse(a.ocurridaEn)),
    [todasAlertas, preferenciasAlertas],
  );
  const noLeidas = alertas.filter((a) => !a.leida).length;

  const valor: AlimentadorValor = {
    cargando,
    error,
    tiempoRealConectado,
    alimentadores,
    alimentador,
    esDueno: alimentador?.miRol === 'Dueno',
    seleccionarAlimentador,
    mascotas,
    mascota,
    seleccionarMascota,
    extras,
    guardarExtrasMascota,
    horarios,
    comandos,
    alertas,
    noLeidas,
    marcarLeida,
    preferenciasAlertas,
    guardarPreferencias,
    ultimaVisita,
    recargar,
    recargarAlimentadores,
    recargarMascotas,
    recargarHorarios,
    recargarComandos,
    registrarComando,
  };

  return <AlimentadorContext.Provider value={valor}>{children}</AlimentadorContext.Provider>;
}

export function useAlimentador(): AlimentadorValor {
  const ctx = useContext(AlimentadorContext);
  if (!ctx) throw new Error('useAlimentador debe usarse dentro de AlimentadorProvider');
  return ctx;
}

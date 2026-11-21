import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Vibration } from 'react-native';

import { api, mensajeDe } from './api';
import { parseHora } from './format';
import { useSession } from './session';
import { Panel, Registro } from './types';

type CasaCtx = {
  panel: Panel | null;
  personas: string[];
  historial: Registro[];
  alertas: Registro[];
  enVivo: boolean;
  error: string | null;
  alertaActiva: Registro | null;
  descartarAlerta: () => void;
  refrescar: () => Promise<void>;
  setLuz: (nombre: string, encendida: boolean) => Promise<void>;
  setSeguridad: (activa: boolean) => Promise<void>;
  abrirPuerta: () => Promise<boolean>;
  addPersona: (nombre: string) => Promise<void>;
  quitarPersona: (nombre: string) => Promise<void>;
};

const Ctx = createContext<CasaCtx | null>(null);

export function CasaProvider({ children }: { children: ReactNode }) {
  const { token, serverUrl } = useSession();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [personas, setPersonas] = useState<string[]>([]);
  const [historial, setHistorial] = useState<Registro[]>([]);
  const [alertas, setAlertas] = useState<Registro[]>([]);
  const [enVivo, setEnVivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertaVivo, setAlertaVivo] = useState<Registro | null>(null);
  const [descartada, setDescartada] = useState<string | null>(null);
  const aviso = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refrescar = useCallback(async () => {
    try {
      const [p, a, al] = await Promise.all([
        api.get<Panel>('/api/panel'),
        api.get<{ personas: string[]; historial: Registro[] }>('/api/accesos'),
        api.get<Registro[]>('/api/alertas'),
      ]);
      setPanel(p);
      setPersonas(a.personas);
      setHistorial(a.historial);
      setAlertas(al);
      setError(null);
    } catch (e) {
      setError(mensajeDe(e));
    }
  }, []);

  // Sondeo cada 4 s (respaldo por si SignalR se cae).
  useEffect(() => {
    if (!token) return;
    void refrescar();
    const id = setInterval(() => void refrescar(), 4000);
    return () => clearInterval(id);
  }, [token, refrescar]);

  // Tiempo real con SignalR: alertas y accesos al instante.
  useEffect(() => {
    if (!token) return;
    const hub = new HubConnectionBuilder()
      .withUrl(`${serverUrl}/hub/alertas`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();

    hub.on('alerta', (a: Registro) => {
      setAlertaVivo(a);
      Vibration.vibrate([0, 350, 120, 350]);
      void refrescar();
    });
    hub.on('acceso', () => {
      void refrescar();
      // La chapa se cierra sola a los 5 s: se vuelve a leer para que la tarjeta cambie.
      setTimeout(() => void refrescar(), 5500);
    });
    hub.onreconnecting(() => setEnVivo(false));
    hub.onreconnected(() => setEnVivo(true));
    hub.onclose(() => setEnVivo(false));

    let activo = true;
    hub
      .start()
      .then(() => activo && setEnVivo(true))
      .catch(() => setEnVivo(false));

    return () => {
      activo = false;
      void hub.stop();
    };
  }, [token, serverUrl, refrescar]);

  const fallo = useCallback((e: unknown) => {
    setError(mensajeDe(e));
    if (aviso.current) clearTimeout(aviso.current);
    aviso.current = setTimeout(() => setError(null), 6000);
  }, []);

  const setLuz = useCallback(
    async (nombre: string, encendida: boolean) => {
      setPanel((p) => (p ? { ...p, luces: { ...p.luces, [nombre]: encendida } } : p));
      try {
        await api.post(`/api/luces/${encodeURIComponent(nombre)}`, { encendida });
      } catch (e) {
        fallo(e);
      } finally {
        await refrescar();
      }
    },
    [refrescar, fallo],
  );

  const setSeguridad = useCallback(
    async (activa: boolean) => {
      setPanel((p) => (p ? { ...p, seguridad: activa } : p));
      try {
        await api.post('/api/seguridad', { activa });
      } catch (e) {
        fallo(e);
      } finally {
        await refrescar();
      }
    },
    [refrescar, fallo],
  );

  const abrirPuerta = useCallback(async () => {
    try {
      const r = await api.post<{ raspberry: boolean }>('/api/accesos/abrir');
      await refrescar();
      return r.raspberry;
    } catch (e) {
      fallo(e);
      return false;
    }
  }, [refrescar, fallo]);

  const addPersona = useCallback(
    async (nombre: string) => {
      try {
        await api.post('/api/accesos/personas', { nombre });
        await refrescar();
      } catch (e) {
        fallo(e);
      }
    },
    [refrescar, fallo],
  );

  const quitarPersona = useCallback(
    async (nombre: string) => {
      try {
        await api.del(`/api/accesos/personas/${encodeURIComponent(nombre)}`);
        await refrescar();
      } catch (e) {
        fallo(e);
      }
    },
    [refrescar, fallo],
  );

  const alertaActiva = useMemo(() => {
    const candidatas = [alertaVivo, alertas[0] ?? null].filter((x): x is Registro => !!x);
    if (!candidatas.length) return null;
    const ultima = candidatas.reduce((a, b) => (parseHora(a.hora) >= parseHora(b.hora) ? a : b));
    const reciente = Date.now() - parseHora(ultima.hora).getTime() < 5 * 60 * 1000;
    return reciente && ultima.hora !== descartada ? ultima : null;
  }, [alertaVivo, alertas, descartada]);

  const value = useMemo<CasaCtx>(
    () => ({
      panel,
      personas,
      historial,
      alertas,
      enVivo,
      error,
      alertaActiva,
      descartarAlerta: () => setDescartada(alertaActiva?.hora ?? null),
      refrescar,
      setLuz,
      setSeguridad,
      abrirPuerta,
      addPersona,
      quitarPersona,
    }),
    [panel, personas, historial, alertas, enVivo, error, alertaActiva, refrescar, setLuz, setSeguridad, abrirPuerta, addPersona, quitarPersona],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCasa() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCasa debe usarse dentro de CasaProvider');
  return c;
}

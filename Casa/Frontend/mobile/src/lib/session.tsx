import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, configureApi } from './api';
import { DEFAULT_API_URL } from './config';
import { storage } from './storage';

const KEY_TOKEN = 'casalink.token';
const KEY_NOMBRE = 'casalink.nombre';
const KEY_URL = 'casalink.url';

type LoginRespuesta = { token: string; nombre?: string };

type SessionCtx = {
  cargada: boolean;
  token: string | null;
  nombre: string;
  serverUrl: string;
  signIn: (usuario: string, password: string) => Promise<void>;
  signInFace: (imagen: string) => Promise<string>;
  signOut: () => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
};

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [cargada, setCargada] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [serverUrl, setUrl] = useState(DEFAULT_API_URL);

  const signOut = useCallback(async () => {
    configureApi({ token: null });
    setToken(null);
    setNombre('');
    await Promise.all([storage.removeItem(KEY_TOKEN), storage.removeItem(KEY_NOMBRE)]);
  }, []);

  useEffect(() => {
    configureApi({ baseUrl: DEFAULT_API_URL, alExpirar: () => void signOut() });
    (async () => {
      try {
        const [t, n, u] = await Promise.all([
          storage.getItem(KEY_TOKEN),
          storage.getItem(KEY_NOMBRE),
          storage.getItem(KEY_URL),
        ]);
        if (u) {
          setUrl(u);
          configureApi({ baseUrl: u });
        }
        if (t) {
          configureApi({ token: t });
          setToken(t);
          setNombre(n ?? '');
        }
      } finally {
        setCargada(true);
      }
    })();
  }, [signOut]);

  const guardar = useCallback(async (r: LoginRespuesta, porDefecto: string) => {
    const nombreFinal = r.nombre?.trim() || porDefecto;
    configureApi({ token: r.token });
    setToken(r.token);
    setNombre(nombreFinal);
    await Promise.all([storage.setItem(KEY_TOKEN, r.token), storage.setItem(KEY_NOMBRE, nombreFinal)]);
    return nombreFinal;
  }, []);

  const signIn = useCallback(
    async (usuario: string, password: string) => {
      const r = await api.post<LoginRespuesta>('/api/login', { usuario: usuario.trim(), password });
      await guardar(r, 'Admin');
    },
    [guardar],
  );

  const signInFace = useCallback(
    async (imagen: string) => {
      const r = await api.post<LoginRespuesta>('/api/login/rostro', { imagen }, 20000);
      return guardar(r, 'Invitado');
    },
    [guardar],
  );

  const setServerUrl = useCallback(async (url: string) => {
    const limpia = url.trim().replace(/\/+$/, '');
    if (!limpia) return;
    configureApi({ baseUrl: limpia });
    setUrl(limpia);
    await storage.setItem(KEY_URL, limpia);
  }, []);

  const value = useMemo(
    () => ({ cargada, token, nombre, serverUrl, signIn, signInFace, signOut, setServerUrl }),
    [cargada, token, nombre, serverUrl, signIn, signInFace, signOut, setServerUrl],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSession debe usarse dentro de SessionProvider');
  return c;
}

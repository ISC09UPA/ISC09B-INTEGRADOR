import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { alExpirarSesion } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { tiempoReal } from '@/api/realtime';
import { borrarSesion, cargarSesion, guardarSesion, sesionActual } from '@/api/tokens';
import { registrarPush } from '@/notifications/push';

export type EstadoSesion = 'cargando' | 'anonimo' | 'autenticado';

export interface Usuario {
  id: number;
  nombre: string;
}

interface AuthValor {
  estado: EstadoSesion;
  usuario: Usuario | null;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrarse: (nombre: string, email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Restaura la sesión guardada en el almacenamiento seguro.
  useEffect(() => {
    let vivo = true;
    cargarSesion()
      .then((s) => {
        if (!vivo) return;
        if (s) {
          setUsuario({ id: s.usuarioId, nombre: s.nombre });
          setEstado('autenticado');
        } else {
          setEstado('anonimo');
        }
      })
      .catch(() => vivo && setEstado('anonimo'));
    return () => {
      vivo = false;
    };
  }, []);

  // Si el refresh token ya no sirve, el cliente avisa y se vuelve al login.
  useEffect(
    () =>
      alExpirarSesion(() => {
        tiempoReal.detener();
        setUsuario(null);
        setEstado('anonimo');
      }),
    [],
  );

  // El token de push se manda cada vez que hay sesión (Expo puede rotarlo).
  useEffect(() => {
    if (estado === 'autenticado') registrarPush();
  }, [estado]);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const s = await guardarSesion(await authApi.login({ email: email.trim(), password }));
    setUsuario({ id: s.usuarioId, nombre: s.nombre });
    setEstado('autenticado');
  }, []);

  const registrarse = useCallback(async (nombre: string, email: string, password: string) => {
    const s = await guardarSesion(await authApi.registro({ nombre: nombre.trim(), email: email.trim(), password }));
    setUsuario({ id: s.usuarioId, nombre: s.nombre });
    setEstado('autenticado');
  }, []);

  const cerrarSesion = useCallback(async () => {
    const s = sesionActual();
    if (s) await authApi.logout(s.refreshToken).catch(() => undefined);
    await tiempoReal.detener();
    await borrarSesion();
    setUsuario(null);
    setEstado('anonimo');
  }, []);

  const valor = useMemo(
    () => ({ estado, usuario, iniciarSesion, registrarse, cerrarSesion }),
    [estado, usuario, iniciarSesion, registrarse, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValor {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

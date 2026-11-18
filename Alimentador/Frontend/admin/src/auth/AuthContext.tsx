import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/cliente';
import { auth } from '../api/endpoints';
import {
  borrarSesion,
  guardarSesion,
  obtenerSesion,
  sesionDesdeAuth,
  suscribirSesion,
} from './sesion';
import type { MotivoCierre, Sesion } from './sesion';

export const MENSAJE_NO_ADMIN =
  'Tu cuenta no tiene permisos de administrador. Pide a un administrador que te dé acceso.';

const MENSAJES_CIERRE: Record<MotivoCierre, string> = {
  expirada: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  sinPermiso: 'Ya no tienes permisos de administrador o tu cuenta se desactivó.',
};

interface ValorAuth {
  sesion: Sesion | null;
  /** Mensaje para la pantalla de inicio cuando la sesión terminó sin que el usuario la cerrara. */
  avisoCierre: string | null;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const Contexto = createContext<ValorAuth | null>(null);

export class NoEsAdministradorError extends Error {
  constructor() {
    super(MENSAJE_NO_ADMIN);
    this.name = 'NoEsAdministradorError';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(obtenerSesion);
  const [avisoCierre, setAvisoCierre] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(
    () =>
      suscribirSesion((nueva, motivo) => {
        setSesion(nueva);
        if (!nueva) {
          queryClient.clear();
          setAvisoCierre(motivo ? MENSAJES_CIERRE[motivo] : null);
        }
      }),
    [queryClient],
  );

  // Al recargar con una sesión guardada, confirma con el backend que sigue siendo administrador.
  useEffect(() => {
    if (!obtenerSesion()) return;
    const control = new AbortController();
    auth
      .yo(control.signal)
      .then((yo) => {
        if (!yo.esAdministrador) borrarSesion('sinPermiso');
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          if (obtenerSesion()) borrarSesion('expirada');
        }
      });
    return () => control.abort();
  }, []);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const r = await auth.login({ email, password });
    if (!r.esAdministrador) {
      // No dejamos un refresh token vivo de una cuenta que no puede usar el panel.
      await auth.logout(r.refreshToken).catch(() => undefined);
      throw new NoEsAdministradorError();
    }
    setAvisoCierre(null);
    guardarSesion(sesionDesdeAuth(r));
  }, []);

  const cerrarSesion = useCallback(async () => {
    const actual = obtenerSesion();
    borrarSesion();
    setAvisoCierre(null);
    if (actual) await auth.logout(actual.refreshToken).catch(() => undefined);
  }, []);

  const valor = useMemo(
    () => ({ sesion, avisoCierre, iniciarSesion, cerrarSesion }),
    [sesion, avisoCierre, iniciarSesion, cerrarSesion],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ValorAuth {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return valor;
}

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { useMediaQuery } from '../hooks/useMediaQuery';

export type PreferenciaTema = 'sistema' | 'claro' | 'oscuro';

interface ValorTema {
  preferencia: PreferenciaTema;
  oscuro: boolean;
  setPreferencia: (p: PreferenciaTema) => void;
}

const CLAVE = 'alimentador.admin.tema';
const Contexto = createContext<ValorTema | null>(null);

function leerPreferencia(): PreferenciaTema {
  const v = localStorage.getItem(CLAVE);
  return v === 'claro' || v === 'oscuro' ? v : 'sistema';
}

/** Tema Fluent 2 claro u oscuro; por defecto sigue al sistema operativo. */
export function TemaProvider({ children }: { children: ReactNode }) {
  const [preferencia, setPreferenciaEstado] = useState<PreferenciaTema>(leerPreferencia);
  const sistemaOscuro = useMediaQuery('(prefers-color-scheme: dark)');
  const oscuro = preferencia === 'oscuro' || (preferencia === 'sistema' && sistemaOscuro);

  useEffect(() => {
    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
    const fondo = (oscuro ? webDarkTheme : webLightTheme).colorNeutralBackground2;
    document.body.style.backgroundColor = fondo;
  }, [oscuro]);

  const valor = useMemo<ValorTema>(
    () => ({
      preferencia,
      oscuro,
      setPreferencia: (p) => {
        localStorage.setItem(CLAVE, p);
        setPreferenciaEstado(p);
      },
    }),
    [preferencia, oscuro],
  );

  return (
    <Contexto.Provider value={valor}>
      <FluentProvider theme={oscuro ? webDarkTheme : webLightTheme} style={{ minHeight: '100dvh' }}>
        {children}
      </FluentProvider>
    </Contexto.Provider>
  );
}

export function useTema(): ValorTema {
  const v = useContext(Contexto);
  if (!v) throw new Error('useTema debe usarse dentro de TemaProvider');
  return v;
}

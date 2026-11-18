import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AriaLiveAnnouncer, makeStyles, Spinner, tokens } from '@fluentui/react-components';
import { ApiError } from './api/cliente';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Marco } from './components/Marco';
import { Notificaciones } from './components/Notificaciones';
import { TemaProvider } from './theme/TemaContext';
import { LoginPage } from './pages/LoginPage';

const ResumenPage = lazy(() => import('./pages/ResumenPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const AlimentadoresPage = lazy(() => import('./pages/AlimentadoresPage'));
const AlimentadorDetallePage = lazy(() => import('./pages/AlimentadorDetallePage'));
const EmbebidosPage = lazy(() => import('./pages/EmbebidosPage'));
const OtaPage = lazy(() => import('./pages/OtaPage'));
const DesplegarPage = lazy(() => import('./pages/DesplegarPage'));
const NoEncontradoPage = lazy(() => import('./pages/NoEncontradoPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // Sin reintentos ante errores 4xx: el backend ya dijo por qué no.
      retry: (intentos, error) => !(error instanceof ApiError && error.status < 500) && intentos < 2,
      refetchOnWindowFocus: true,
    },
  },
  mutationCache: new MutationCache(),
});

function RequiereAdmin() {
  const { sesion } = useAuth();
  const ubicacion = useLocation();
  if (!sesion) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }
  return <Outlet />;
}

const useEstilos = makeStyles({ cargando: { paddingTop: tokens.spacingVerticalXXXL } });

function Cargando() {
  const s = useEstilos();
  return <Spinner label="Cargando…" className={s.cargando} />;
}

function ConSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Cargando />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequiereAdmin />,
    children: [
      {
        element: <Marco />,
        children: [
          { index: true, element: <ConSuspense><ResumenPage /></ConSuspense> },
          { path: 'usuarios', element: <ConSuspense><UsuariosPage /></ConSuspense> },
          { path: 'alimentadores', element: <ConSuspense><AlimentadoresPage /></ConSuspense> },
          { path: 'alimentadores/:id', element: <ConSuspense><AlimentadorDetallePage /></ConSuspense> },
          { path: 'embebidos', element: <ConSuspense><EmbebidosPage /></ConSuspense> },
          { path: 'ota', element: <ConSuspense><OtaPage /></ConSuspense> },
          { path: 'ota/desplegar', element: <ConSuspense><DesplegarPage /></ConSuspense> },
          { path: '*', element: <ConSuspense><NoEncontradoPage /></ConSuspense> },
        ],
      },
    ],
  },
]);

export function App() {
  return (
    <TemaProvider>
      <AriaLiveAnnouncer>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
            <Notificaciones />
          </AuthProvider>
        </QueryClientProvider>
      </AriaLiveAnnouncer>
    </TemaProvider>
  );
}

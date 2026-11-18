import { useMemo } from 'react';
import {
  Toast,
  ToastBody,
  ToastTitle,
  Toaster,
  useToastController,
} from '@fluentui/react-components';
import { useMediaQuery, CONSULTA_MOVIL } from '../hooks/useMediaQuery';

const ID_TOASTER = 'notificaciones-admin';

/** Un solo Toaster para toda la app (guía de Fluent: una posición, pocos toasts a la vez). */
export function Notificaciones() {
  const movil = useMediaQuery(CONSULTA_MOVIL);
  return (
    <Toaster
      toasterId={ID_TOASTER}
      position={movil ? 'bottom' : 'bottom-end'}
      pauseOnHover
      pauseOnWindowBlur
      limit={3}
    />
  );
}

export function useNotificar() {
  const { dispatchToast } = useToastController(ID_TOASTER);
  return useMemo(
    () => ({
      exito: (titulo: string, cuerpo?: string) =>
        dispatchToast(
          <Toast>
            <ToastTitle>{titulo}</ToastTitle>
            {cuerpo && <ToastBody>{cuerpo}</ToastBody>}
          </Toast>,
          { intent: 'success', timeout: 4000 },
        ),
      error: (titulo: string, cuerpo?: string) =>
        dispatchToast(
          <Toast>
            <ToastTitle>{titulo}</ToastTitle>
            {cuerpo && <ToastBody>{cuerpo}</ToastBody>}
          </Toast>,
          { intent: 'error', timeout: 8000, politeness: 'assertive' },
        ),
    }),
    [dispatchToast],
  );
}

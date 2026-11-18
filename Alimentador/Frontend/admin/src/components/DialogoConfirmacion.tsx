import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  tokens,
  useId,
} from '@fluentui/react-components';
import { ErrorCircleFilled } from '@fluentui/react-icons';
import { mensajeDeError } from '../api/cliente';

const useEstilos = makeStyles({
  contenido: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalM },
  peligro: {
    backgroundColor: tokens.colorStatusDangerBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    ':hover': { backgroundColor: tokens.colorStatusDangerBackground3Hover, color: tokens.colorNeutralForegroundOnBrand },
    ':hover:active': { backgroundColor: tokens.colorStatusDangerBackground3Pressed, color: tokens.colorNeutralForegroundOnBrand },
  },
});

interface Props {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  textoConfirmar: string;
  /** Texto del botón que cierra sin hacer nada (por defecto "Cancelar"). */
  textoCancelar?: string;
  /** Acción destructiva: el botón principal usa el color de peligro. */
  peligroso?: boolean;
  onConfirmar: () => Promise<unknown>;
  onCerrar: () => void;
}

/**
 * Confirmación antes de una acción con consecuencias. Si el backend responde con error,
 * el `detail` se muestra dentro del diálogo y este queda abierto para reintentar o cancelar.
 */
export function DialogoConfirmacion({ abierto, titulo, children, textoConfirmar, textoCancelar = 'Cancelar', peligroso, onConfirmar, onCerrar }: Props) {
  const s = useEstilos();
  const idTitulo = useId('confirmar-titulo');
  const idCuerpo = useId('confirmar-cuerpo');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (abierto) {
      setError(null);
      setEnviando(false);
    }
  }, [abierto]);

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar();
      onCerrar();
    } catch (e) {
      setError(e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog
      open={abierto}
      modalType="alert"
      onOpenChange={(_, d) => {
        if (!d.open && !enviando) onCerrar();
      }}
    >
      <DialogSurface aria-labelledby={idTitulo} aria-describedby={idCuerpo}>
        <DialogBody>
          <DialogTitle id={idTitulo}>{titulo}</DialogTitle>
          <DialogContent className={s.contenido}>
            <div id={idCuerpo}>{children}</div>
            {error !== null && (
              <MessageBar intent="error" layout="multiline" icon={<ErrorCircleFilled />}>
                <MessageBarBody>{mensajeDeError(error)}</MessageBarBody>
              </MessageBar>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCerrar} disabled={enviando}>
              {textoCancelar}
            </Button>
            <Button
              appearance="primary"
              onClick={confirmar}
              disabled={enviando}
              icon={enviando ? <Spinner size="tiny" /> : undefined}
              className={peligroso && !enviando ? s.peligro : undefined}
            >
              {textoConfirmar}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

import { useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import type { ButtonProps } from '@fluentui/react-components';
import { CheckmarkRegular, CopyRegular } from '@fluentui/react-icons';
import { useNotificar } from './Notificaciones';

interface Props {
  valor: string;
  /** Qué se copia, para el nombre accesible: "Copiar SHA-256". */
  etiqueta: string;
  conTexto?: boolean;
  size?: ButtonProps['size'];
  appearance?: ButtonProps['appearance'];
}

export function BotonCopiar({ valor, etiqueta, conTexto = false, size = 'small', appearance = 'subtle' }: Props) {
  const [copiado, setCopiado] = useState(false);
  const notificar = useNotificar();

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      notificar.exito('Copiado al portapapeles');
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      notificar.error('No se pudo copiar', 'Tu navegador bloqueó el acceso al portapapeles. Selecciona el texto y cópialo a mano.');
    }
  };

  const icono = copiado ? <CheckmarkRegular /> : <CopyRegular />;
  if (conTexto) {
    return (
      <Button size={size} appearance={appearance} icon={icono} onClick={copiar}>
        {copiado ? 'Copiado' : 'Copiar'}
      </Button>
    );
  }
  return (
    <Tooltip content={etiqueta} relationship="label" withArrow>
      <Button size={size} appearance={appearance} icon={icono} onClick={copiar} />
    </Tooltip>
  );
}

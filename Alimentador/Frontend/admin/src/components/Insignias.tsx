import type { ReactElement } from 'react';
import { Badge } from '@fluentui/react-components';
import type { BadgeProps } from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  CircleRegular,
  ClockRegular,
  DismissCircleRegular,
  PlugDisconnectedRegular,
  SendRegular,
  ShieldPersonRegular,
  PersonProhibitedRegular,
  HourglassHalfRegular,
  WifiOffRegular,
} from '@fluentui/react-icons';
import type { EstadoComando } from '../api/types';
import { ETIQUETAS_ESTADO_COMANDO } from '../utils/formato';

/** Las insignias siempre llevan texto e icono: el color nunca es la única señal. */
type Props = Pick<BadgeProps, 'size'>;

export function InsigniaConexion({ enLinea, sincronizando, size = 'medium' }: Props & { enLinea: boolean; sincronizando?: boolean }) {
  if (enLinea && sincronizando) {
    return (
      <Badge appearance="tint" color="informative" icon={<ArrowSyncRegular />} size={size}>
        Sincronizando
      </Badge>
    );
  }
  return enLinea ? (
    <Badge appearance="tint" color="success" icon={<CheckmarkCircleRegular />} size={size}>
      En línea
    </Badge>
  ) : (
    <Badge appearance="tint" color="danger" icon={<WifiOffRegular />} size={size}>
      Sin conexión
    </Badge>
  );
}

export function InsigniaSinGateway({ size = 'medium' }: Props) {
  return (
    <Badge appearance="tint" color="warning" icon={<PlugDisconnectedRegular />} size={size}>
      Sin Raspberry Pi
    </Badge>
  );
}

export function InsigniaAdmin({ size = 'medium' }: Props) {
  return (
    <Badge appearance="tint" color="brand" icon={<ShieldPersonRegular />} size={size}>
      Administrador
    </Badge>
  );
}

export function InsigniaInactivo({ size = 'medium' }: Props) {
  return (
    <Badge appearance="tint" color="subtle" icon={<PersonProhibitedRegular />} size={size}>
      Inactivo
    </Badge>
  );
}

const ESTILO_COMANDO: Record<EstadoComando, { color: BadgeProps['color']; icono: ReactElement }> = {
  Pendiente: { color: 'informative', icono: <ClockRegular /> },
  Entregado: { color: 'brand', icono: <SendRegular /> },
  Completado: { color: 'success', icono: <CheckmarkCircleRegular /> },
  Fallido: { color: 'danger', icono: <DismissCircleRegular /> },
  Vencido: { color: 'warning', icono: <HourglassHalfRegular /> },
};

export function InsigniaComando({ estado, size = 'medium' }: Props & { estado: EstadoComando }) {
  const e = ESTILO_COMANDO[estado] ?? { color: 'subtle', icono: <CircleRegular /> };
  return (
    <Badge appearance="tint" color={e.color} icon={e.icono} size={size}>
      {ETIQUETAS_ESTADO_COMANDO[estado] ?? estado}
    </Badge>
  );
}

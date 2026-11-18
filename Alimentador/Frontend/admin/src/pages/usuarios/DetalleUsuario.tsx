import { useQuery } from '@tanstack/react-query';
import {
  Body1,
  Button,
  Caption1,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderTitle,
  makeStyles,
  mergeClasses,
  OverlayDrawer,
  Skeleton,
  SkeletonItem,
  Subtitle2,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  PersonAvailableRegular,
  PersonProhibitedRegular,
  ShieldDismissRegular,
  ShieldPersonRegular,
} from '@fluentui/react-icons';
import { admin, claves } from '../../api/endpoints';
import { EnlaceRuta } from '../../components/EnlaceRuta';
import { EstadoError } from '../../components/Estados';
import { FechaEnLinea } from '../../components/Fecha';
import { InsigniaAdmin, InsigniaConexion, InsigniaInactivo } from '../../components/Insignias';
import { CONSULTA_MOVIL, useMediaQuery } from '../../hooks/useMediaQuery';
import { fechaAbsoluta } from '../../utils/formato';
import { ETIQUETAS_ROL } from '../../utils/etiquetas';
import type { AccionUsuario } from '../UsuariosPage';

const useEstilos = makeStyles({
  cuerpo: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalXL, paddingBottom: tokens.spacingVerticalL },
  insignias: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  datos: {
    display: 'grid',
    gridTemplateColumns: 'max-content minmax(0, 1fr)',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalS,
    margin: 0,
  },
  termino: { color: tokens.colorNeutralForeground3 },
  definicion: { margin: 0, overflowWrap: 'anywhere' },
  bloque: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalS },
  titulo: { margin: 0 },
  lista: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  elemento: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  vacio: { color: tokens.colorNeutralForeground3 },
  secundario: { color: tokens.colorNeutralForeground3 },
  pie: { flexWrap: 'wrap' },
  mono: { fontFamily: tokens.fontFamilyMonospace },
});

interface Props {
  id: number | null;
  esYo: boolean;
  onCerrar: () => void;
  onAccion: (a: AccionUsuario) => void;
}

/** Panel lateral con el detalle de un usuario: membresías, Raspberry Pi y acciones. */
export function DetalleUsuario({ id, esYo, onCerrar, onAccion }: Props) {
  const s = useEstilos();
  const movil = useMediaQuery(CONSULTA_MOVIL);
  const consulta = useQuery({
    queryKey: [...claves.usuarios, 'detalle', id],
    queryFn: ({ signal }) => admin.usuario(id!, signal),
    enabled: id !== null,
  });
  const u = consulta.data;

  return (
    <OverlayDrawer
      position="end"
      size={movil ? 'full' : 'medium'}
      open={id !== null}
      onOpenChange={(_, d) => !d.open && onCerrar()}
      aria-label={u ? `Detalle de ${u.nombre}` : 'Detalle del usuario'}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={<Button appearance="subtle" aria-label="Cerrar" icon={<Dismiss24Regular />} onClick={onCerrar} />}
        >
          {u?.nombre ?? 'Usuario'}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {consulta.isPending && (
          <Skeleton aria-label="Cargando detalle del usuario" className={s.cuerpo}>
            <SkeletonItem size={24} />
            <SkeletonItem size={16} />
            <SkeletonItem size={16} />
            <SkeletonItem size={64} />
          </Skeleton>
        )}
        {consulta.isError && (
          <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
        )}
        {u && (
          <div className={s.cuerpo}>
            {(u.esAdministrador || !u.activo) && (
              <div className={s.insignias}>
                {u.esAdministrador && <InsigniaAdmin />}
                {!u.activo && <InsigniaInactivo />}
              </div>
            )}
            <dl className={s.datos}>
              <dt className={s.termino}>Correo</dt>
              <dd className={s.definicion}>{u.email}</dd>
              <dt className={s.termino}>Alta</dt>
              <dd className={s.definicion}>{fechaAbsoluta(u.creadoEn)}</dd>
              <dt className={s.termino}>Último acceso</dt>
              <dd className={s.definicion}>
                <FechaEnLinea iso={u.ultimoAcceso} />
              </dd>
            </dl>

            <section className={s.bloque} aria-labelledby="titulo-membresias">
              <Subtitle2 as="h3" id="titulo-membresias" className={s.titulo}>
                Alimentadores ({u.membresias.length})
              </Subtitle2>
              {u.membresias.length === 0 ? (
                <Body1 className={s.vacio}>No pertenece a ningún alimentador.</Body1>
              ) : (
                <ul className={s.lista}>
                  {u.membresias.map((m) => (
                    <li key={m.alimentadorId} className={s.elemento}>
                      <span>
                        <EnlaceRuta to={`/alimentadores/${m.alimentadorId}`}>{m.nombre}</EnlaceRuta>{' '}
                        <Caption1 className={mergeClasses(s.secundario, s.mono)}>{m.codigo}</Caption1>
                      </span>
                      <Text>{ETIQUETAS_ROL[m.rol]}</Text>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={s.bloque} aria-labelledby="titulo-gateways">
              <Subtitle2 as="h3" id="titulo-gateways" className={s.titulo}>
                Raspberry Pi ({u.listaGateways.length})
              </Subtitle2>
              {u.listaGateways.length === 0 ? (
                <Body1 className={s.vacio}>No ha registrado ninguna Raspberry Pi.</Body1>
              ) : (
                <ul className={s.lista}>
                  {u.listaGateways.map((g) => (
                    <li key={g.id} className={s.elemento}>
                      <EnlaceRuta to="/embebidos" className={s.mono}>
                        {g.deviceId}
                      </EnlaceRuta>
                      <InsigniaConexion enLinea={g.enLinea} size="small" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DrawerBody>
      {u && !esYo && (
        <DrawerFooter className={s.pie}>
          {u.esAdministrador ? (
            <Button icon={<ShieldDismissRegular />} onClick={() => onAccion({ tipo: 'admin', usuario: u, valor: false })}>
              Quitar administrador
            </Button>
          ) : (
            <Button icon={<ShieldPersonRegular />} onClick={() => onAccion({ tipo: 'admin', usuario: u, valor: true })}>
              Hacer administrador
            </Button>
          )}
          {u.activo ? (
            <Button icon={<PersonProhibitedRegular />} onClick={() => onAccion({ tipo: 'activo', usuario: u, valor: false })}>
              Desactivar cuenta
            </Button>
          ) : (
            <Button icon={<PersonAvailableRegular />} onClick={() => onAccion({ tipo: 'activo', usuario: u, valor: true })}>
              Activar cuenta
            </Button>
          )}
        </DrawerFooter>
      )}
      {u && esYo && (
        <DrawerFooter>
          <Caption1 className={s.secundario}>No puedes cambiar tu propio rol ni desactivar tu cuenta.</Caption1>
        </DrawerFooter>
      )}
    </OverlayDrawer>
  );
}

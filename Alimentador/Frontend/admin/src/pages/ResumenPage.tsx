import type { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Caption1,
  Card,
  makeStyles,
  mergeClasses,
  ProgressBar,
  Skeleton,
  SkeletonItem,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  AlertRegular,
  AnimalCatRegular,
  AnimalDogRegular,
  ArrowSyncCircleRegular,
  CameraRegular,
  DeveloperBoardRegular,
  DismissCircleRegular,
  PeopleRegular,
  PlugDisconnectedRegular,
  WarningRegular,
  WifiOffRegular,
} from '@fluentui/react-icons';
import { admin, claves } from '../api/endpoints';
import type { VersionConteo } from '../api/types';
import { Actualizacion, AUTO_ACTUALIZAR } from '../components/Actualizacion';
import { Encabezado } from '../components/Encabezado';
import { EnlaceRuta } from '../components/EnlaceRuta';
import { AvisoDesactualizado, EstadoError } from '../components/Estados';
import { Seccion } from '../components/Seccion';
import { useTitulo } from '../hooks/useTitulo';
import { numero, plural } from '../utils/formato';

const useEstilos = makeStyles({
  rejilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalXXL,
  },
  tarjeta: {
    cursor: 'pointer',
    rowGap: tokens.spacingVerticalS,
    minHeight: '148px',
  },
  cabecera: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS },
  icono: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontSize: '18px',
  },
  iconoAviso: {
    backgroundColor: tokens.colorStatusWarningBackground1,
    color: tokens.colorStatusWarningForeground1,
  },
  iconoPeligro: {
    backgroundColor: tokens.colorStatusDangerBackground1,
    color: tokens.colorStatusDangerForeground1,
  },
  enlace: { fontWeight: tokens.fontWeightSemibold },
  valor: {
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: 'tabular-nums',
  },
  deTotal: {
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightRegular,
  },
  detalle: { color: tokens.colorNeutralForeground2 },
  pieTarjeta: { marginTop: 'auto' },
  versiones: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  lista: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalM },
  filaVersion: {
    display: 'grid',
    gridTemplateColumns: 'minmax(96px, 9rem) minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalM,
  },
  version: { fontFamily: tokens.fontFamilyMonospace, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sinVersion: { color: tokens.colorNeutralForeground3, fontStyle: 'italic' },
  conteo: { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: tokens.colorNeutralForeground2 },
  esqueleto: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalM, padding: tokens.spacingHorizontalL },
});

type Tono = 'normal' | 'aviso' | 'peligro';

interface PropsTarjeta {
  titulo: string;
  ruta: string;
  icono: ReactNode;
  valor: number;
  total?: number;
  detalle: ReactNode;
  tono?: Tono;
  insignia?: ReactNode;
}

/** Indicador clicable: el título es el enlace (accesible por teclado) y toda la tarjeta responde al clic. */
function TarjetaKpi({ titulo, ruta, icono, valor, total, detalle, tono = 'normal', insignia }: PropsTarjeta) {
  const s = useEstilos();
  const navegar = useNavigate();
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a')) return;
    navegar(ruta);
  };
  return (
    <Card className={s.tarjeta} onClick={onClick} appearance="filled">
      <div className={s.cabecera}>
        <span
          className={mergeClasses(s.icono, tono === 'aviso' && s.iconoAviso, tono === 'peligro' && s.iconoPeligro)}
          aria-hidden
        >
          {icono}
        </span>
        <EnlaceRuta to={ruta} className={s.enlace} appearance="subtle">
          {titulo}
        </EnlaceRuta>
      </div>
      <Text className={s.valor}>
        {numero(valor)}
        {total !== undefined && <span className={s.deTotal}> de {numero(total)}</span>}
      </Text>
      <Caption1 className={s.detalle}>{detalle}</Caption1>
      {insignia && <div className={s.pieTarjeta}>{insignia}</div>}
    </Card>
  );
}

function Versiones({ titulo, datos, total }: { titulo: string; datos: VersionConteo[]; total: number }) {
  const s = useEstilos();
  const ordenados = [...datos].sort((a, b) => b.alimentadores - a.alimentadores);
  const maximo = Math.max(1, ...ordenados.map((d) => d.alimentadores));
  return (
    <Seccion titulo={titulo}>
      {ordenados.length === 0 ? (
        <Caption1 className={s.detalle}>Ningún alimentador ha reportado versión.</Caption1>
      ) : (
        <ul className={s.lista}>
          {ordenados.map((d) => (
            <li key={d.version ?? 'ninguna'} className={s.filaVersion}>
              <Text className={mergeClasses(s.version, d.version === null && s.sinVersion)}>
                {d.version ?? 'Sin reportar'}
              </Text>
              <ProgressBar value={d.alimentadores} max={maximo} thickness="large" aria-hidden />
              <Text className={s.conteo}>
                {plural(d.alimentadores, 'alimentador', 'alimentadores')}
                {total > 0 && ` (${Math.round((d.alimentadores / total) * 100)} %)`}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

function EsqueletoResumen() {
  const s = useEstilos();
  return (
    <div className={s.rejilla} aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <Card key={i} className={s.tarjeta}>
          <Skeleton aria-label={i === 0 ? 'Cargando indicadores' : undefined} className={s.esqueleto}>
            <SkeletonItem size={16} />
            <SkeletonItem size={40} style={{ width: '40%' }} />
            <SkeletonItem size={12} />
          </Skeleton>
        </Card>
      ))}
    </div>
  );
}

export default function ResumenPage() {
  const s = useEstilos();
  useTitulo('Resumen');
  const consulta = useQuery({
    queryKey: claves.resumen,
    queryFn: ({ signal }) => admin.resumen(signal),
    ...AUTO_ACTUALIZAR,
  });
  const r = consulta.data;

  return (
    <>
      <Encabezado
        titulo="Resumen"
        descripcion="Estado general de cuentas, dispositivos y actualizaciones."
        acciones={
          <Actualizacion
            actualizadoEn={consulta.dataUpdatedAt}
            actualizando={consulta.isFetching}
            onActualizar={() => void consulta.refetch()}
            automatico
          />
        }
      />

      {consulta.isPending && <EsqueletoResumen />}
      {consulta.isError && !r && (
        <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
      )}

      {r && consulta.isError && (
        <AvisoDesactualizado error={consulta.error} onReintentar={() => void consulta.refetch()} />
      )}
      {r && (
        <>
          <section aria-label="Indicadores" className={s.rejilla}>
            <TarjetaKpi
              titulo="Usuarios"
              ruta="/usuarios"
              icono={<PeopleRegular />}
              valor={r.usuarios.total}
              detalle={`${numero(r.usuarios.activos)} activos · ${plural(r.usuarios.administradores, 'administrador', 'administradores')} · ${numero(r.usuarios.nuevos7Dias)} nuevos en 7 días`}
            />
            <TarjetaKpi
              titulo="Alimentadores en línea"
              ruta="/alimentadores?estado=enLinea"
              icono={<AnimalDogRegular />}
              valor={r.alimentadores.enLinea}
              total={r.alimentadores.total}
              detalle="ESP32 que reportan estado a su Raspberry Pi."
            />
            <TarjetaKpi
              titulo="Alimentadores sin conexión"
              ruta="/alimentadores?estado=sinConexion"
              icono={<WifiOffRegular />}
              valor={r.alimentadores.sinConexion}
              tono={r.alimentadores.sinConexion > 0 ? 'peligro' : 'normal'}
              detalle="No han reportado a tiempo."
            />
            <TarjetaKpi
              titulo="Sin Raspberry Pi"
              ruta="/alimentadores?estado=sinGateway"
              icono={<PlugDisconnectedRegular />}
              valor={r.alimentadores.sinGateway}
              tono={r.alimentadores.sinGateway > 0 ? 'aviso' : 'normal'}
              detalle="Alimentadores sin gateway ligado."
            />
            <TarjetaKpi
              titulo="Raspberry Pi en línea"
              ruta="/embebidos"
              icono={<DeveloperBoardRegular />}
              valor={r.gateways.enLinea}
              total={r.gateways.total}
              tono={r.gateways.sinConexion > 0 ? 'aviso' : 'normal'}
              detalle={`${numero(r.gateways.sinConexion)} sin conexión · ${numero(r.gateways.sincronizando)} sincronizando`}
            />
            <TarjetaKpi
              titulo="Mascotas activas"
              ruta="/alimentadores"
              icono={<AnimalCatRegular />}
              valor={r.mascotas.activas}
              detalle={`${plural(r.mascotas.perros, 'perro')} · ${plural(r.mascotas.gatos, 'gato')}`}
            />
            <TarjetaKpi
              titulo="Alertas en 24 h"
              ruta="/embebidos?pestana=eventos"
              icono={<AlertRegular />}
              valor={r.alertas24h}
              tono={r.alertas24h > 0 ? 'aviso' : 'normal'}
              detalle="Atascos, tolvas bajas, desconexiones y apetito."
            />
            <TarjetaKpi
              titulo="OTA en curso"
              ruta="/ota?pestana=despliegues"
              icono={<ArrowSyncCircleRegular />}
              valor={r.ota.enCurso}
              detalle={`Pendientes o entregadas · ${plural(r.ota.artefactos, 'artefacto')} publicados`}
            />
            <TarjetaKpi
              titulo="OTA fallidas (7 días)"
              ruta="/ota?pestana=despliegues&estado=Fallido"
              icono={<DismissCircleRegular />}
              valor={r.ota.fallidas7Dias}
              tono={r.ota.fallidas7Dias > 0 ? 'peligro' : 'normal'}
              detalle="No cuenta las canceladas por un administrador."
            />
            <TarjetaKpi
              titulo="Fotos por revisar"
              ruta="/embebidos?pestana=fotos"
              icono={<CameraRegular />}
              valor={r.fotosPorRevisar}
              detalle="Detecciones dudosas para reentrenar el modelo."
              insignia={
                r.fotosPorRevisar > 0 ? (
                  <Badge appearance="tint" color="warning" icon={<WarningRegular />}>
                    Pendientes
                  </Badge>
                ) : undefined
              }
            />
          </section>

          <div className={s.versiones}>
            <Versiones titulo="Versiones de firmware" datos={r.versionesFirmware} total={r.alimentadores.total} />
            <Versiones titulo="Versiones del modelo" datos={r.versionesModelo} total={r.alimentadores.total} />
          </div>
        </>
      )}
    </>
  );
}

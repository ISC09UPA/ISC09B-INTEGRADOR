import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Body1,
  Caption1,
  makeStyles,
  mergeClasses,
  Skeleton,
  SkeletonItem,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  AlertRegular,
  AnimalCatRegular,
  AnimalDogRegular,
  CalendarClockRegular,
  CloudArrowDownRegular,
  HistoryRegular,
  WarningRegular,
} from '@fluentui/react-icons';
import { ApiError } from '../api/cliente';
import { admin, claves } from '../api/endpoints';
import type { AlertaDto, AlimentadorAdminDetalleDto, ComandoAdminDto, MascotaAdminDto, MiembroDto } from '../api/types';
import { BotonRuta } from '../components/BotonRuta';
import { Encabezado } from '../components/Encabezado';
import { EstadoError, EstadoVacio } from '../components/Estados';
import { Fecha, FechaEnLinea } from '../components/Fecha';
import { InsigniaComando, InsigniaConexion, InsigniaSinGateway } from '../components/Insignias';
import { Migas } from '../components/Migas';
import { NivelTolva } from '../components/NivelTolva';
import { Seccion } from '../components/Seccion';
import { Tabla } from '../components/Tabla';
import type { Columna } from '../components/Tabla';
import { useTitulo } from '../hooks/useTitulo';
import { decimal1, ETIQUETAS_ALERTA, fechaAbsoluta, nombreTolva, numero } from '../utils/formato';
import { ETIQUETAS_ROL } from '../utils/etiquetas';

const useEstilos = makeStyles({
  rejilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalL,
    '@media (max-width: 1023px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  completo: { gridColumn: '1 / -1' },
  tolvas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalXL,
    '@media (max-width: 639px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  datos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    margin: 0,
  },
  dato: { display: 'flex', flexDirection: 'column', rowGap: '2px', minWidth: 0 },
  termino: { color: tokens.colorNeutralForeground3 },
  definicion: { margin: 0, overflowWrap: 'anywhere' },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  pila: { display: 'flex', flexDirection: 'column', rowGap: '2px', minWidth: 0 },
  linea: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  secundario: { color: tokens.colorNeutralForeground3 },
  filaBaja: { opacity: 0.72 },
  lista: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  elemento: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    ':last-child': { borderBottom: 'none' },
  },
  hora: { fontVariantNumeric: 'tabular-nums', fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase400 },
  esqueleto: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalL },
  numero: { fontVariantNumeric: 'tabular-nums' },
});

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  const s = useEstilos();
  return (
    <div className={s.dato}>
      <dt className={s.termino}>
        <Caption1>{termino}</Caption1>
      </dt>
      <dd className={s.definicion}>{children}</dd>
    </div>
  );
}

function descripcionComando(c: ComandoAdminDto): string {
  if (c.tipo === 'Ota') {
    return c.artefacto ? `OTA ${c.artefacto.tipo === 'Firmware' ? 'firmware' : 'modelo'} ${c.artefacto.version}` : 'OTA';
  }
  const pedido = c.gramos !== null ? `${decimal1(c.gramos, 'g')}` : '';
  const real = c.dispensadoG !== null ? ` · salieron ${decimal1(c.dispensadoG, 'g')}` : '';
  return `Dispensar ${pedido}${real}`;
}

function Estado({ a }: { a: AlimentadorAdminDetalleDto }) {
  const s = useEstilos();
  const e = a.estado;
  return (
    <Seccion titulo="Estado" className={s.completo}>
      <div className={s.tolvas}>
        <NivelTolva etiqueta="Tolva de perro" porcentaje={e.nivelTolvaPerroPorcentaje} />
        <NivelTolva etiqueta="Tolva de gato" porcentaje={e.nivelTolvaGatoPorcentaje} />
      </div>
      <dl className={s.datos}>
        <Dato termino="Conexión">
          <span className={s.linea}>
            {a.gateway ? <InsigniaConexion enLinea={e.enLinea} /> : <InsigniaSinGateway />}
          </span>
        </Dato>
        <Dato termino="Raspberry Pi">
          {a.gateway ? (
            <span className={s.linea}>
              <Text className={s.mono}>{a.gateway.deviceId}</Text>
              <InsigniaConexion enLinea={e.gatewayEnLinea} size="small" />
            </span>
          ) : (
            'Ninguna'
          )}
        </Dato>
        <Dato termino="Plato del perro">{decimal1(e.pesoPlatoPerroG, 'g')}</Dato>
        <Dato termino="Plato del gato">{decimal1(e.pesoPlatoGatoG, 'g')}</Dato>
        <Dato termino="Firmware">
          <Text className={s.mono}>{e.versionFirmware ?? 'Sin reportar'}</Text>
        </Dato>
        <Dato termino="Modelo">
          <Text className={s.mono}>{e.versionModelo ?? 'Sin reportar'}</Text>
        </Dato>
        <Dato termino="Última sincronización">
          <Fecha iso={e.ultimaSincronizacion} />
        </Dato>
        <Dato termino="Dispensado remoto">{e.dispensadoRemotoDisponible ? 'Disponible' : 'No disponible'}</Dato>
      </dl>
    </Seccion>
  );
}

function Configuracion({ a }: { a: AlimentadorAdminDetalleDto }) {
  const s = useEstilos();
  return (
    <Seccion titulo="Configuración">
      <dl className={s.datos}>
        <Dato termino="Dueño">{a.dueno ? `${a.dueno.nombre} (${a.dueno.email})` : 'Sin dueño'}</Dato>
        <Dato termino="Zona horaria">{a.zonaHoraria}</Dato>
        <Dato termino="Energía del alimento">{decimal1(a.kcalPorGramo, 'kcal/g')}</Dato>
        <Dato termino="Intervalo mínimo">{`${numero(a.intervaloMinimoHoras)} h entre comidas`}</Dato>
        <Dato termino="Versión de configuración">{numero(a.versionConfiguracion)}</Dato>
        <Dato termino="Alta">{fechaAbsoluta(a.creadoEn)}</Dato>
      </dl>
    </Seccion>
  );
}

function Miembros({ lista }: { lista: MiembroDto[] }) {
  const s = useEstilos();
  return (
    <Seccion titulo={`Miembros (${lista.length})`}>
      {lista.length === 0 ? (
        <Body1 className={s.secundario}>Sin miembros.</Body1>
      ) : (
        <ul className={s.lista}>
          {lista.map((m) => (
            <li key={m.usuarioId} className={s.elemento}>
              <span className={s.pila}>
                <Text>{m.nombre}</Text>
                <Caption1 className={s.secundario}>{m.email}</Caption1>
              </span>
              <Badge appearance="outline" color={m.rol === 'Dueno' ? 'brand' : 'informative'}>
                {ETIQUETAS_ROL[m.rol]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

function Mascotas({ lista }: { lista: MascotaAdminDto[] }) {
  const s = useEstilos();
  const columnas: Columna<MascotaAdminDto>[] = [
    {
      id: 'nombre',
      encabezado: 'Mascota',
      ancho: '20%',
      celda: (m) => (
        <span className={s.pila}>
          <span className={s.linea}>
            {m.especie === 'Perro' ? <AnimalDogRegular aria-hidden /> : <AnimalCatRegular aria-hidden />}
            <Text weight="semibold">{m.nombre}</Text>
            {!m.activa && (
              <Badge appearance="tint" color="subtle" size="small">
                De baja
              </Badge>
            )}
          </span>
          <Caption1 className={s.secundario}>
            {m.especie} · tolva {nombreTolva(m.tolva).toLowerCase()}
          </Caption1>
        </span>
      ),
    },
    {
      id: 'fisico',
      encabezado: 'Peso y edad',
      ancho: '14%',
      celda: (m) => `${decimal1(m.pesoKg, 'kg')} · ${m.edadMeses >= 24 ? `${Math.floor(m.edadMeses / 12)} años` : `${m.edadMeses} meses`}`,
    },
    {
      id: 'racion',
      encabezado: 'Ración diaria',
      ancho: '16%',
      celda: (m) => (
        <span className={s.pila}>
          <Text className={s.numero}>{decimal1(m.gramosPorDiaRecomendados, 'g')}</Text>
          <Caption1 className={s.secundario}>
            {m.comidasPorDia} comidas · ajuste {m.ajustePorcentaje > 0 ? '+' : ''}
            {m.ajustePorcentaje} %
          </Caption1>
        </span>
      ),
    },
    {
      id: 'rfid',
      encabezado: 'Etiqueta RFID',
      ancho: '16%',
      secundaria: true,
      celda: (m) => <Text className={s.mono}>{m.etiquetaRfid ?? '—'}</Text>,
    },
    { id: 'visita', encabezado: 'Última visita', ancho: '18%', celda: (m) => <Fecha iso={m.ultimaVisita} /> },
  ];
  return (
    <Seccion titulo={`Mascotas (${lista.filter((m) => m.activa).length} activas)`} className={s.completo}>
      {lista.length === 0 ? (
        <EstadoVacio icono={<AnimalDogRegular />} titulo="Sin mascotas" descripcion="El dueño aún no registra mascotas en este alimentador." />
      ) : (
        <Tabla
          items={lista}
          columnas={columnas}
          getId={(m) => m.id}
          etiqueta="Mascotas"
          anchoMinimo={760}
          claseFila={(m) => (m.activa ? undefined : s.filaBaja)}
        />
      )}
    </Seccion>
  );
}

function Horarios({ a }: { a: AlimentadorAdminDetalleDto }) {
  const s = useEstilos();
  const nombreMascota = (id: number | null) =>
    id === null ? 'Todas las mascotas' : (a.listaMascotas.find((m) => m.id === id)?.nombre ?? `Mascota ${id}`);
  const ordenados = [...a.horarios].sort((x, y) => x.hora.localeCompare(y.hora));
  return (
    <Seccion titulo={`Horarios (${a.horarios.length})`}>
      {ordenados.length === 0 ? (
        <EstadoVacio icono={<CalendarClockRegular />} titulo="Sin horarios" descripcion="Sirve solo cuando una mascota se acerca." />
      ) : (
        <ul className={s.lista}>
          {ordenados.map((h) => (
            <li key={h.id} className={s.elemento}>
              <span className={s.linea}>
                <time className={s.hora}>{h.hora}</time>
                <Text>{nombreMascota(h.mascotaId)}</Text>
              </span>
              {h.activo ? (
                <Badge appearance="tint" color="success" size="small">
                  Activo
                </Badge>
              ) : (
                <Badge appearance="tint" color="subtle" size="small">
                  Pausado
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

function Alertas({ lista }: { lista: AlertaDto[] }) {
  const s = useEstilos();
  return (
    <Seccion titulo="Últimas alertas">
      {lista.length === 0 ? (
        <EstadoVacio icono={<AlertRegular />} titulo="Sin alertas" />
      ) : (
        <ul className={s.lista}>
          {lista.map((al) => (
            <li key={al.id} className={s.elemento}>
              <span className={s.pila}>
                <span className={s.linea}>
                  <Text weight="semibold">{ETIQUETAS_ALERTA[al.tipo] ?? al.tipo}</Text>
                  {!al.leida && (
                    <Badge appearance="tint" color="warning" size="small" icon={<WarningRegular />}>
                      Sin leer
                    </Badge>
                  )}
                </span>
                <Caption1>{al.mensaje}</Caption1>
              </span>
              <Caption1 className={s.secundario}>
                <FechaEnLinea iso={al.ocurridaEn} />
              </Caption1>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

function Comandos({ lista }: { lista: ComandoAdminDto[] }) {
  const s = useEstilos();
  const columnas: Columna<ComandoAdminDto>[] = [
    { id: 'tipo', encabezado: 'Comando', ancho: '26%', celda: (c) => descripcionComando(c) },
    { id: 'estado', encabezado: 'Estado', ancho: '14%', celda: (c) => <InsigniaComando estado={c.estado} size="small" /> },
    { id: 'por', encabezado: 'Solicitado por', ancho: '16%', secundaria: true, celda: (c) => c.solicitadoPor?.nombre ?? 'Sistema' },
    { id: 'creado', encabezado: 'Creado', ancho: '18%', celda: (c) => <Fecha iso={c.creadoEn} /> },
    {
      id: 'resultado',
      encabezado: 'Resultado',
      ancho: '26%',
      celda: (c) =>
        c.error ? (
          <Caption1>{c.error}</Caption1>
        ) : c.completadoEn ? (
          <Caption1 className={s.secundario}>
            Terminó <FechaEnLinea iso={c.completadoEn} />
          </Caption1>
        ) : (
          <Caption1 className={s.secundario}>—</Caption1>
        ),
    },
  ];
  return (
    <Seccion titulo="Últimos comandos" className={s.completo}>
      {lista.length === 0 ? (
        <EstadoVacio icono={<HistoryRegular />} titulo="Sin comandos" descripcion="Aquí aparecen los dispensados remotos y las actualizaciones." />
      ) : (
        <Tabla items={lista} columnas={columnas} getId={(c) => c.id} etiqueta="Últimos comandos" anchoMinimo={760} />
      )}
    </Seccion>
  );
}

export default function AlimentadorDetallePage() {
  const s = useEstilos();
  const { id: idTexto } = useParams();
  const id = Number(idTexto);
  const consulta = useQuery({
    queryKey: [...claves.alimentadores, 'detalle', id],
    queryFn: ({ signal }) => admin.alimentador(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  });
  const a = consulta.data;
  useTitulo(a ? `${a.nombre} (${a.codigo})` : 'Alimentador');

  const migas = (
    <Migas
      migas={[
        { texto: 'Alimentadores', ruta: '/alimentadores' },
        { texto: a?.nombre ?? 'Detalle', ruta: `/alimentadores/${id}` },
      ]}
    />
  );

  if (consulta.isError && !a) {
    const noExiste = consulta.error instanceof ApiError && consulta.error.status === 404;
    return (
      <>
        <Encabezado antes={migas} titulo="Alimentador" />
        <EstadoError
          titulo={noExiste ? 'Este alimentador no existe' : 'No se pudo cargar el alimentador'}
          error={consulta.error}
          onReintentar={noExiste ? undefined : () => void consulta.refetch()}
          reintentando={consulta.isFetching}
        />
      </>
    );
  }

  if (!a) {
    return (
      <>
        <Encabezado antes={migas} titulo="Alimentador" />
        <div aria-busy="true">
          <Skeleton aria-label="Cargando alimentador" className={s.esqueleto}>
            <SkeletonItem size={128} />
            <SkeletonItem size={64} />
            <SkeletonItem size={64} />
          </Skeleton>
        </div>
      </>
    );
  }

  return (
    <>
      <Encabezado
        antes={migas}
        titulo={a.nombre}
        descripcion={
          <span className={s.linea}>
            <Text className={mergeClasses(s.mono, s.secundario)}>{a.codigo}</Text>
            {a.gateway ? <InsigniaConexion enLinea={a.estado.enLinea} size="small" /> : <InsigniaSinGateway size="small" />}
          </span>
        }
        acciones={
          <>
            <BotonRuta to={`/embebidos?pestana=eventos&alimentadorId=${a.id}`} icon={<WarningRegular />}>
              Eventos
            </BotonRuta>
            <BotonRuta to={`/ota?pestana=despliegues&alimentadorId=${a.id}`} icon={<HistoryRegular />}>
              Historial OTA
            </BotonRuta>
            <BotonRuta to={`/ota/desplegar?alimentadores=${a.id}`} icon={<CloudArrowDownRegular />} appearance="primary">
              Actualizar
            </BotonRuta>
          </>
        }
      />
      <div className={s.rejilla}>
        <Estado a={a} />
        <Configuracion a={a} />
        <Miembros lista={a.listaMiembros} />
        <Mascotas lista={a.listaMascotas} />
        <Horarios a={a} />
        <Alertas lista={a.ultimasAlertas} />
        <Comandos lista={a.ultimosComandos} />
      </div>
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Card,
  Checkbox,
  Dropdown,
  Field,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  SearchBox,
  Text,
  tokens,
} from '@fluentui/react-components';
import { AnimalDogRegular, CheckmarkCircleRegular, RocketRegular, WarningRegular } from '@fluentui/react-icons';
import { admin, claves, ota } from '../api/endpoints';
import type { AlimentadorAdminDto, ArtefactoOtaDto, LanzarDespliegueResponse } from '../api/types';
import { BarraFiltros, useEstilosFiltros } from '../components/BarraFiltros';
import { BotonRuta } from '../components/BotonRuta';
import { DialogoConfirmacion } from '../components/DialogoConfirmacion';
import { Encabezado } from '../components/Encabezado';
import { EnlaceRuta } from '../components/EnlaceRuta';
import { CargandoTabla, EstadoError, EstadoVacio } from '../components/Estados';
import { FiltroOpciones } from '../components/FiltroOpciones';
import { InsigniaComando, InsigniaConexion, InsigniaSinGateway } from '../components/Insignias';
import { Migas } from '../components/Migas';
import { Paginador } from '../components/Paginador';
import { Seccion } from '../components/Seccion';
import { Tabla } from '../components/Tabla';
import type { Columna, IdFila } from '../components/Tabla';
import { useBusqueda } from '../hooks/useBusqueda';
import { TAMANO_PAGINA, useParametros } from '../hooks/useParametros';
import { useTitulo } from '../hooks/useTitulo';
import { fechaCorta, plural, tamanoLegible } from '../utils/formato';
import { esFiltroEstado, OPCIONES_ESTADO_ALIMENTADOR } from './AlimentadoresPage';

const MAX_ALIMENTADORES = 200;

const useEstilos = makeStyles({
  pasos: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalL },
  artefacto: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalM, maxWidth: '560px' },
  pila: { display: 'flex', flexDirection: 'column', rowGap: '2px', minWidth: 0, alignItems: 'flex-start' },
  linea: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  secundario: { color: tokens.colorNeutralForeground3 },
  barraAccion: {
    position: 'sticky',
    bottom: 0,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow8,
    borderRadius: tokens.borderRadiusMedium,
  },
  resultado: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalL },
  cuerpo: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalXXS },
  acciones: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  lista: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  elemento: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    ':last-child': { borderBottom: 'none' },
  },
});

function textoArtefacto(a: ArtefactoOtaDto) {
  return `${a.tipo === 'Firmware' ? 'Firmware' : 'Modelo'} ${a.version}`;
}

/** "el firmware 1.3.0" / "el modelo m-2026-11-01" para usar dentro de una frase. */
function artefactoEnFrase(a: ArtefactoOtaDto) {
  return `${a.tipo === 'Firmware' ? 'el firmware' : 'el modelo'} ${a.version}`;
}

function versionActual(a: AlimentadorAdminDto, art: ArtefactoOtaDto | undefined) {
  if (!art) return null;
  return art.tipo === 'Firmware' ? a.estado.versionFirmware : a.estado.versionModelo;
}

function Resultado({
  r,
  artefacto,
  nombres,
  onOtro,
}: {
  r: LanzarDespliegueResponse;
  artefacto: ArtefactoOtaDto | undefined;
  nombres: Map<number, AlimentadorAdminDto>;
  onOtro: () => void;
}) {
  const s = useEstilos();
  const titulo = useRef<HTMLDivElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  return (
    <div className={s.resultado}>
      <div ref={titulo} tabIndex={-1}>
        <MessageBar
          intent={r.creados.length > 0 ? 'success' : 'warning'}
          layout="multiline"
          icon={r.creados.length > 0 ? undefined : <WarningRegular />}
        >
          <MessageBarBody className={s.cuerpo}>
            <MessageBarTitle>
              {r.creados.length > 0
                ? `Se lanzó ${artefacto ? artefactoEnFrase(artefacto) : 'la actualización'} a ${plural(r.creados.length, 'alimentador', 'alimentadores')}`
                : 'No se creó ninguna actualización'}
            </MessageBarTitle>
            {r.omitidos.length > 0
              ? `${plural(r.omitidos.length, 'alimentador se omitió', 'alimentadores se omitieron')}; abajo está el motivo.`
              : 'La Raspberry Pi de cada uno la recogerá en su siguiente consulta.'}
          </MessageBarBody>
        </MessageBar>
      </div>
      {r.creados.length > 0 && (
        <Seccion titulo={`Creados (${r.creados.length})`}>
          <ul className={s.lista}>
            {r.creados.map((c) => (
              <li key={c.id} className={s.elemento}>
                <span className={s.linea}>
                  <EnlaceRuta to={`/alimentadores/${c.alimentadorId}`}>{c.alimentadorNombre}</EnlaceRuta>
                  <Caption1 className={mergeClasses(s.secundario, s.mono)}>{c.alimentadorCodigo}</Caption1>
                </span>
                <InsigniaComando estado={c.estado} size="small" />
              </li>
            ))}
          </ul>
        </Seccion>
      )}
      {r.omitidos.length > 0 && (
        <Seccion titulo={`Omitidos (${r.omitidos.length})`}>
          <ul className={s.lista}>
            {r.omitidos.map((o) => {
              const a = nombres.get(o.alimentadorId);
              return (
                <li key={o.alimentadorId} className={s.elemento}>
                  <span className={s.linea}>
                    {a ? (
                      <>
                        <EnlaceRuta to={`/alimentadores/${a.id}`}>{a.nombre}</EnlaceRuta>
                        <Caption1 className={mergeClasses(s.secundario, s.mono)}>{a.codigo}</Caption1>
                      </>
                    ) : (
                      <Text>Alimentador {o.alimentadorId}</Text>
                    )}
                  </span>
                  <Text>{o.motivo}</Text>
                </li>
              );
            })}
          </ul>
        </Seccion>
      )}
      <div className={s.acciones}>
        <BotonRuta
          to={`/ota?pestana=despliegues${artefacto ? `&artefactoId=${artefacto.id}` : ''}`}
          appearance="primary"
        >
          Ver historial de despliegues
        </BotonRuta>
        <Button onClick={onOtro}>Lanzar otro despliegue</Button>
      </div>
    </div>
  );
}

export default function DesplegarPage() {
  const s = useEstilos();
  const f = useEstilosFiltros();
  useTitulo('Lanzar despliegue');
  const queryClient = useQueryClient();
  const { texto, numero, numeroOpcional, cambiar } = useParametros();
  const pagina = numero('pagina', 1);
  const estadoUrl = texto('estado', 'todos');
  const estado = esFiltroEstado(estadoUrl) ? estadoUrl : 'todos';
  const { valor: buscar, setValor: setBuscar, aplicado: buscarUrl } = useBusqueda();

  const [artefactoId, setArtefactoId] = useState<number | null>(numeroOpcional('artefacto'));
  const [omitir, setOmitir] = useState(true);
  const [seleccion, setSeleccion] = useState<Set<IdFila>>(() => {
    const ids = texto('alimentadores')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    return new Set(ids);
  });
  const [confirmar, setConfirmar] = useState(false);
  const [resultado, setResultado] = useState<LanzarDespliegueResponse | null>(null);
  const vistos = useRef(new Map<number, AlimentadorAdminDto>());

  const artefactos = useQuery({ queryKey: claves.artefactos, queryFn: ({ signal }) => ota.artefactos(signal) });
  const artefacto = artefactos.data?.find((a) => a.id === artefactoId);

  const consulta = useQuery({
    queryKey: [...claves.alimentadores, 'lista', { buscar: buscarUrl, estado, pagina }],
    queryFn: ({ signal }) =>
      admin.alimentadores({ buscar: buscarUrl || undefined, estado, pagina, tamano: TAMANO_PAGINA }, signal),
    placeholderData: keepPreviousData,
  });
  const datos = consulta.data;
  datos?.elementos.forEach((a) => vistos.current.set(a.id, a));

  const lanzar = useMutation({
    mutationFn: () =>
      admin.lanzarDespliegue({
        artefactoId: artefactoId!,
        alimentadorIds: [...seleccion].map(Number),
        omitirSiYaTieneVersion: omitir,
      }),
    onSuccess: (r) => {
      setResultado(r);
      void queryClient.invalidateQueries({ queryKey: claves.despliegues });
      void queryClient.invalidateQueries({ queryKey: claves.resumen });
    },
  });

  const cuantos = seleccion.size;
  const demasiados = cuantos > MAX_ALIMENTADORES;
  const puedeLanzar = artefacto !== undefined && cuantos > 0 && !demasiados;

  const yaLaTienen = useMemo(() => {
    if (!artefacto) return 0;
    return [...seleccion].filter((id) => {
      const a = vistos.current.get(Number(id));
      return a && versionActual(a, artefacto) === artefacto.version;
    }).length;
    // vistos se actualiza en cada render con los datos de la página
  }, [seleccion, artefacto, datos]);

  const columnas: Columna<AlimentadorAdminDto>[] = [
    {
      id: 'alimentador',
      encabezado: 'Alimentador',
      ancho: '30%',
      celda: (a) => (
        <span className={s.pila}>
          <Text weight="semibold">{a.nombre}</Text>
          <Caption1 className={mergeClasses(s.secundario, s.mono)}>{a.codigo}</Caption1>
        </span>
      ),
    },
    {
      id: 'conexion',
      encabezado: 'Conexión',
      ancho: '22%',
      celda: (a) => (a.gateway ? <InsigniaConexion enLinea={a.estado.enLinea} size="small" /> : <InsigniaSinGateway size="small" />),
    },
    {
      id: 'version',
      encabezado: artefacto ? `${artefacto.tipo === 'Firmware' ? 'Firmware' : 'Modelo'} actual` : 'Versión actual',
      ancho: '28%',
      celda: (a) => {
        const v = artefacto ? versionActual(a, artefacto) : a.estado.versionFirmware;
        return (
          <span className={s.linea}>
            <Text className={s.mono}>{v ?? 'Sin reportar'}</Text>
            {artefacto && v === artefacto.version && (
              <Badge appearance="tint" color="success" size="small" icon={<CheckmarkCircleRegular />}>
                Ya la tiene
              </Badge>
            )}
          </span>
        );
      },
    },
    { id: 'dueno', encabezado: 'Dueño', ancho: '20%', secundaria: true, celda: (a) => a.dueno?.nombre ?? '—' },
  ];

  const migas = (
    <Migas
      migas={[
        { texto: 'Actualizaciones OTA', ruta: '/ota' },
        { texto: 'Lanzar despliegue', ruta: '/ota/desplegar' },
      ]}
    />
  );

  if (resultado) {
    return (
      <>
        <Encabezado antes={migas} titulo="Resultado del despliegue" />
        <Resultado
          r={resultado}
          artefacto={artefacto}
          nombres={vistos.current}
          onOtro={() => {
            setResultado(null);
            setSeleccion(new Set());
          }}
        />
      </>
    );
  }

  return (
    <>
      <Encabezado
        antes={migas}
        titulo="Lanzar despliegue"
        descripcion="Elige un artefacto y los alimentadores que lo recibirán. Cada Raspberry Pi lo instala en sus ESP32."
      />
      <div className={s.pasos}>
        <Seccion titulo="1. Artefacto">
          <div className={s.artefacto}>
            {artefactos.isError ? (
              <EstadoError error={artefactos.error} titulo="No se pudieron cargar los artefactos" onReintentar={() => void artefactos.refetch()} />
            ) : artefactos.data && artefactos.data.length === 0 ? (
              <MessageBar intent="warning" icon={<WarningRegular />} layout="multiline">
                <MessageBarBody>No hay artefactos publicados. Sube uno en la pestaña Artefactos.</MessageBarBody>
              </MessageBar>
            ) : (
              <Field label="Firmware o modelo" required>
                <Dropdown
                  placeholder={artefactos.isPending ? 'Cargando…' : 'Elige un artefacto'}
                  disabled={artefactos.isPending}
                  value={artefacto ? textoArtefacto(artefacto) : ''}
                  selectedOptions={artefacto ? [String(artefacto.id)] : []}
                  onOptionSelect={(_, d) => setArtefactoId(d.optionValue ? Number(d.optionValue) : null)}
                  positioning={{ autoSize: true }}
                >
                  {(artefactos.data ?? []).map((a) => (
                    <Option key={a.id} value={String(a.id)} text={textoArtefacto(a)}>
                      <span className={s.pila}>
                        <Text>{textoArtefacto(a)}</Text>
                        <Caption1 className={s.secundario}>
                          {tamanoLegible(a.tamanoBytes)} · publicado el {fechaCorta(a.creadoEn)}
                        </Caption1>
                      </span>
                    </Option>
                  ))}
                </Dropdown>
              </Field>
            )}
            <Checkbox
              checked={omitir}
              onChange={(_, d) => setOmitir(d.checked === true)}
              label="Omitir los alimentadores que ya tienen esta versión"
            />
          </div>
        </Seccion>

        <Seccion titulo="2. Alimentadores">
          <BarraFiltros>
            <Field label="Buscar" className={f.busqueda}>
              <SearchBox value={buscar} onChange={(_, d) => setBuscar(d.value)} placeholder="Código, nombre o correo del dueño" />
            </Field>
            <FiltroOpciones
              etiqueta="Estado"
              className={f.filtro}
              valor={estado}
              opciones={OPCIONES_ESTADO_ALIMENTADOR}
              onCambiar={(v) => cambiar({ estado: v === 'todos' ? null : v })}
            />
          </BarraFiltros>
          {consulta.isPending && <CargandoTabla etiqueta="Cargando alimentadores" />}
          {consulta.isError && !datos && (
            <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
          )}
          {datos && datos.elementos.length === 0 && (
            <EstadoVacio icono={<AnimalDogRegular />} titulo="Ningún alimentador coincide" descripcion="Cambia la búsqueda o el filtro." />
          )}
          {datos && datos.elementos.length > 0 && (
            <>
              <Tabla
                items={datos.elementos}
                columnas={columnas}
                getId={(a) => a.id}
                etiqueta="Alimentadores para actualizar"
                anchoMinimo={720}
                seleccion={{
                  seleccionados: seleccion,
                  onCambiar: setSeleccion,
                  etiquetaFila: (a) => `Seleccionar ${a.nombre} (${a.codigo})`,
                }}
              />
              <Paginador
                pagina={datos.pagina}
                tamano={datos.tamano}
                total={datos.total}
                etiqueta="alimentadores"
                cargando={consulta.isFetching}
                onCambiar={(p) => cambiar({ pagina: p })}
              />
            </>
          )}
        </Seccion>

        <Card className={s.barraAccion} role="region" aria-label="Resumen de la selección">
          <span className={s.pila}>
            <Text weight="semibold" aria-live="polite">
              {cuantos === 0 ? 'Ningún alimentador seleccionado' : plural(cuantos, 'alimentador seleccionado', 'alimentadores seleccionados')}
            </Text>
            <Caption1 className={s.secundario}>
              {demasiados
                ? `El máximo por despliegue es ${MAX_ALIMENTADORES}.`
                : !artefacto
                  ? 'Elige primero un artefacto.'
                  : omitir && yaLaTienen > 0
                    ? `${plural(yaLaTienen, 'ya tiene', 'ya tienen')} ${artefacto.version} y se omitirán.`
                    : 'La selección se conserva al cambiar de página.'}
            </Caption1>
          </span>
          <span className={s.acciones}>
            {cuantos > 0 && <Button onClick={() => setSeleccion(new Set())}>Quitar selección</Button>}
            <Button appearance="primary" icon={<RocketRegular />} disabled={!puedeLanzar} onClick={() => setConfirmar(true)}>
              {cuantos > 0 ? `Lanzar a ${plural(cuantos, 'alimentador', 'alimentadores')}` : 'Lanzar'}
            </Button>
          </span>
        </Card>
      </div>

      <DialogoConfirmacion
        abierto={confirmar}
        titulo="¿Lanzar la actualización?"
        textoConfirmar="Lanzar"
        onCerrar={() => setConfirmar(false)}
        onConfirmar={() => lanzar.mutateAsync()}
      >
        <Body1>
          Se enviará {artefacto ? artefactoEnFrase(artefacto) : ''} a {plural(cuantos, 'alimentador', 'alimentadores')}.{' '}
          {omitir ? 'Se omitirán los que ya tengan esa versión. ' : ''}
          También se omiten los que ya tienen una actualización en curso.
        </Body1>
      </DialogoConfirmacion>
    </>
  );
}

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Caption1, Card, Field, makeStyles, mergeClasses, SearchBox, Text, tokens } from '@fluentui/react-components';
import { AnimalDogRegular } from '@fluentui/react-icons';
import { admin, claves } from '../api/endpoints';
import type { AlimentadorAdminDto, FiltroEstadoAlimentador } from '../api/types';
import { BarraFiltros, useEstilosFiltros } from '../components/BarraFiltros';
import { Encabezado } from '../components/Encabezado';
import { EnlaceRuta } from '../components/EnlaceRuta';
import { AvisoDesactualizado, CargandoTabla, EstadoError, EstadoVacio } from '../components/Estados';
import { Fecha } from '../components/Fecha';
import { FiltroOpciones } from '../components/FiltroOpciones';
import { InsigniaConexion, InsigniaSinGateway } from '../components/Insignias';
import { NivelTolva } from '../components/NivelTolva';
import { Paginador } from '../components/Paginador';
import { Tabla } from '../components/Tabla';
import type { Columna } from '../components/Tabla';
import { useAnunciar } from '../hooks/useAnunciar';
import { useBusqueda } from '../hooks/useBusqueda';
import { TAMANO_PAGINA, useParametros } from '../hooks/useParametros';
import { useTitulo } from '../hooks/useTitulo';
import { numero, plural } from '../utils/formato';

export const OPCIONES_ESTADO_ALIMENTADOR: { valor: FiltroEstadoAlimentador; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'enLinea', texto: 'En línea' },
  { valor: 'sinConexion', texto: 'Sin conexión' },
  { valor: 'sinGateway', texto: 'Sin Raspberry Pi' },
];

export function esFiltroEstado(v: string): v is FiltroEstadoAlimentador {
  return OPCIONES_ESTADO_ALIMENTADOR.some((o) => o.valor === v);
}

const useEstilos = makeStyles({
  pila: { display: 'flex', flexDirection: 'column', rowGap: '2px', minWidth: 0 },
  secundario: { color: tokens.colorNeutralForeground3, overflowWrap: 'anywhere' },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  tolvas: { display: 'grid', gridTemplateColumns: 'auto minmax(64px, 1fr)', alignItems: 'center', columnGap: tokens.spacingHorizontalS, rowGap: '2px' },
  numero: { fontVariantNumeric: 'tabular-nums' },
  tarjeta: { padding: 0, overflow: 'hidden' },
  contenidoTarjeta: { padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL} ${tokens.spacingVerticalM}` },
});

export default function AlimentadoresPage() {
  const s = useEstilos();
  const f = useEstilosFiltros();
  useTitulo('Alimentadores y mascotas');
  const { texto, numero: num, cambiar } = useParametros();
  const pagina = num('pagina', 1);
  const estadoUrl = texto('estado', 'todos');
  const estado: FiltroEstadoAlimentador = esFiltroEstado(estadoUrl) ? estadoUrl : 'todos';
  const { valor: buscar, setValor: setBuscar, aplicado: buscarUrl } = useBusqueda();

  const consulta = useQuery({
    queryKey: [...claves.alimentadores, 'lista', { buscar: buscarUrl, estado, pagina }],
    queryFn: ({ signal }) =>
      admin.alimentadores({ buscar: buscarUrl || undefined, estado, pagina, tamano: TAMANO_PAGINA }, signal),
    placeholderData: keepPreviousData,
  });
  const datos = consulta.data;
  const filtrando = buscarUrl !== '' || estado !== 'todos';

  useAnunciar(
    datos && !consulta.isPlaceholderData && filtrando
      ? plural(datos.total, 'alimentador encontrado', 'alimentadores encontrados')
      : null,
  );

  const columnas: Columna<AlimentadorAdminDto>[] = [
    {
      id: 'alimentador',
      encabezado: 'Alimentador',
      ancho: '19%',
      celda: (a) => (
        <span className={s.pila}>
          <EnlaceRuta to={`/alimentadores/${a.id}`}>{a.nombre}</EnlaceRuta>
          <Caption1 className={mergeClasses(s.secundario, s.mono)}>{a.codigo}</Caption1>
        </span>
      ),
    },
    {
      id: 'dueno',
      encabezado: 'Dueño',
      ancho: '17%',
      secundaria: true,
      celda: (a) =>
        a.dueno ? (
          <span className={s.pila}>
            <Text>{a.dueno.nombre}</Text>
            <Caption1 className={s.secundario}>{a.dueno.email}</Caption1>
          </span>
        ) : (
          <Caption1 className={s.secundario}>Sin dueño</Caption1>
        ),
    },
    {
      id: 'conexion',
      encabezado: 'Conexión',
      ancho: '16%',
      celda: (a) => (
        <span className={s.pila}>
          {a.gateway ? <InsigniaConexion enLinea={a.estado.enLinea} size="small" /> : <InsigniaSinGateway size="small" />}
          {a.gateway && <Caption1 className={mergeClasses(s.secundario, s.mono)}>{a.gateway.deviceId}</Caption1>}
        </span>
      ),
    },
    {
      id: 'tolvas',
      encabezado: 'Tolvas',
      ancho: '15%',
      celda: (a) => (
        <span className={s.tolvas}>
          <Caption1>Perro</Caption1>
          <NivelTolva etiqueta={`Tolva de perro de ${a.nombre}`} porcentaje={a.estado.nivelTolvaPerroPorcentaje} compacto />
          <Caption1>Gato</Caption1>
          <NivelTolva etiqueta={`Tolva de gato de ${a.nombre}`} porcentaje={a.estado.nivelTolvaGatoPorcentaje} compacto />
        </span>
      ),
    },
    {
      id: 'versiones',
      encabezado: 'Firmware · modelo',
      ancho: '14%',
      secundaria: true,
      celda: (a) => (
        <span className={s.pila}>
          <Text className={s.mono}>{a.estado.versionFirmware ?? '—'}</Text>
          <Caption1 className={mergeClasses(s.secundario, s.mono)}>{a.estado.versionModelo ?? '—'}</Caption1>
        </span>
      ),
    },
    { id: 'mascotas', encabezado: 'Mascotas', ancho: '8%', alinear: 'end', secundaria: true, celda: (a) => <Text className={s.numero}>{numero(a.mascotas)}</Text> },
    { id: 'sync', encabezado: 'Última sincronización', ancho: '15%', celda: (a) => <Fecha iso={a.estado.ultimaSincronizacion} /> },
  ];

  return (
    <>
      <Encabezado titulo="Alimentadores y mascotas" descripcion="Todos los comederos registrados, su conexión y el nivel de sus tolvas." />

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

      {datos && consulta.isError && <AvisoDesactualizado error={consulta.error} onReintentar={() => void consulta.refetch()} />}

      <Card className={s.tarjeta}>
        <div className={s.contenidoTarjeta}>
          {consulta.isPending && <CargandoTabla etiqueta="Cargando alimentadores" />}
          {consulta.isError && !datos && (
            <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
          )}
          {datos && datos.elementos.length === 0 && (
            <EstadoVacio
              icono={<AnimalDogRegular />}
              titulo={filtrando ? 'Ningún alimentador coincide' : 'Todavía no hay alimentadores'}
              descripcion={filtrando ? 'Cambia la búsqueda o el filtro de estado.' : 'Aparecerán cuando un usuario registre su comedero desde la app.'}
              accion={
                filtrando ? (
                  <Button
                    onClick={() => {
                      setBuscar('');
                      cambiar({ estado: null, buscar: null });
                    }}
                  >
                    Quitar filtros
                  </Button>
                ) : undefined
              }
            />
          )}
          {datos && datos.elementos.length > 0 && (
            <>
              <Tabla items={datos.elementos} columnas={columnas} getId={(a) => a.id} etiqueta="Alimentadores" anchoMinimo={980} />
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
        </div>
      </Card>
    </>
  );
}

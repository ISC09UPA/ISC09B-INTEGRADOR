import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Caption1,
  Card,
  CardPreview,
  makeStyles,
  mergeClasses,
  Text,
  tokens,
  ToggleButton,
  useId,
} from '@fluentui/react-components';
import {
  AnimalCatRegular,
  AnimalDogRegular,
  CameraRegular,
  CheckmarkCircleRegular,
  CircleOffRegular,
  ImageOffRegular,
  SparkleRegular,
} from '@fluentui/react-icons';
import type { ReactElement } from 'react';
import { mensajeDeError } from '../../api/cliente';
import { admin, claves } from '../../api/endpoints';
import { CLASES_DETECTADAS } from '../../api/types';
import type { ClaseDetectada, FiltroFotos, FotoDudosaAdminDto } from '../../api/types';
import { AUTO_ACTUALIZAR } from '../../components/Actualizacion';
import { BarraFiltros, useEstilosFiltros } from '../../components/BarraFiltros';
import { EnlaceRuta } from '../../components/EnlaceRuta';
import { AvisoDesactualizado, CargandoTabla, EstadoError, EstadoVacio } from '../../components/Estados';
import { Fecha } from '../../components/Fecha';
import { FiltroOpciones } from '../../components/FiltroOpciones';
import { useNotificar } from '../../components/Notificaciones';
import { Paginador } from '../../components/Paginador';
import { useParametros } from '../../hooks/useParametros';
import { fechaAbsoluta, porciento } from '../../utils/formato';

const TAMANO_FOTOS = 24;

const ICONOS: Record<ClaseDetectada, ReactElement> = {
  Perro: <AnimalDogRegular />,
  Gato: <AnimalCatRegular />,
  Paloma: <SparkleRegular />,
  Nada: <CircleOffRegular />,
};

const useEstilos = makeStyles({
  rejilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: tokens.spacingHorizontalL,
    listStyleType: 'none',
    margin: 0,
    padding: 0,
  },
  card: { height: '100%', rowGap: tokens.spacingVerticalS },
  imagen: {
    display: 'block',
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  sinImagen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  iconoSinImagen: { fontSize: '32px' },
  prediccion: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  meta: { display: 'flex', flexDirection: 'column', rowGap: '2px', color: tokens.colorNeutralForeground3 },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  grupo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalXS,
    marginTop: 'auto',
  },
  etiquetaGrupo: { color: tokens.colorNeutralForeground2 },
  contenedor: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalM },
});

function TarjetaFoto({ foto }: { foto: FotoDudosaAdminDto }) {
  const s = useEstilos();
  const idGrupo = useId('clasificar');
  const queryClient = useQueryClient();
  const notificar = useNotificar();
  const revisar = useMutation({
    mutationFn: (clase: ClaseDetectada) => admin.revisarFoto(foto.id, clase),
    onSuccess: (r) => {
      notificar.exito(`Foto marcada como ${r.claseRevisada ?? ''}`);
      void queryClient.invalidateQueries({ queryKey: claves.fotos });
      void queryClient.invalidateQueries({ queryKey: claves.resumen });
    },
    onError: (e) => notificar.error('No se pudo guardar la revisión', mensajeDeError(e)),
  });
  const confianzaBaja = foto.confianza < 0.5;
  const tomada = fechaAbsoluta(foto.tomadaEn);

  return (
    <li>
      <Card className={s.card}>
        <CardPreview>
          {foto.url ? (
            <img
              src={foto.url}
              alt={`Foto de ${foto.alimentadorCodigo} tomada el ${tomada}; el modelo predijo ${foto.clasePredicha}`}
              className={s.imagen}
              loading="lazy"
            />
          ) : (
            <div className={mergeClasses(s.imagen, s.sinImagen)}>
              <ImageOffRegular className={s.iconoSinImagen} aria-hidden />
              <span>La Raspberry Pi aún no sube la foto</span>
            </div>
          )}
        </CardPreview>
        <div className={s.prediccion}>
          <Text weight="semibold">Predicción: {foto.clasePredicha}</Text>
          <Badge appearance="tint" color={confianzaBaja ? 'warning' : 'informative'} size="small">
            {porciento(foto.confianza)} de confianza
          </Badge>
        </div>
        <div className={s.meta}>
          <Caption1>
            <EnlaceRuta to={`/alimentadores/${foto.alimentadorId}`} className={s.mono}>
              {foto.alimentadorCodigo}
            </EnlaceRuta>
          </Caption1>
          <Caption1>
            <Fecha iso={foto.tomadaEn} conAbsoluta={false} /> · {tomada}
          </Caption1>
        </div>
        {foto.claseRevisada && (
          <Badge appearance="tint" color="success" icon={<CheckmarkCircleRegular />}>
            Revisada: {foto.claseRevisada}
          </Badge>
        )}
        {foto.subida ? (
        <div className={s.contenedor}>
          <Caption1 id={idGrupo} className={s.etiquetaGrupo}>
            {foto.claseRevisada ? 'Cambiar la clase correcta' : '¿Qué se ve en la foto?'}
          </Caption1>
          <div className={s.grupo} role="group" aria-labelledby={idGrupo}>
            {CLASES_DETECTADAS.map((c) => (
              <ToggleButton
                key={c}
                size="small"
                icon={ICONOS[c]}
                checked={foto.claseRevisada === c}
                disabled={revisar.isPending}
                onClick={() => foto.claseRevisada !== c && revisar.mutate(c)}
              >
                {c}
              </ToggleButton>
            ))}
          </div>
        </div>
        ) : (
          <Caption1 className={s.etiquetaGrupo}>Podrás revisarla cuando se suba.</Caption1>
        )}
      </Card>
    </li>
  );
}

export function PestanaFotos() {
  const s = useEstilos();
  const f = useEstilosFiltros();
  const { texto, numero, cambiar } = useParametros();
  const pagina = numero('pagina', 1);
  const estadoUrl = texto('estado', 'pendientes');
  const estado: FiltroFotos = estadoUrl === 'revisadas' || estadoUrl === 'todas' ? estadoUrl : 'pendientes';

  const consulta = useQuery({
    queryKey: [...claves.fotos, { estado, pagina }],
    queryFn: ({ signal }) => admin.fotos({ estado, pagina, tamano: TAMANO_FOTOS }, signal),
    placeholderData: keepPreviousData,
    ...AUTO_ACTUALIZAR,
  });
  const datos = consulta.data;

  return (
    <>
      <BarraFiltros>
        <FiltroOpciones
          etiqueta="Mostrar"
          className={f.filtro}
          valor={estado}
          opciones={[
            { valor: 'pendientes', texto: 'Pendientes' },
            { valor: 'revisadas', texto: 'Revisadas' },
            { valor: 'todas', texto: 'Todas' },
          ]}
          onCambiar={(v) => cambiar({ estado: v === 'pendientes' ? null : v })}
        />
      </BarraFiltros>
      {datos && consulta.isError && <AvisoDesactualizado error={consulta.error} onReintentar={() => void consulta.refetch()} />}
      {consulta.isPending && <CargandoTabla etiqueta="Cargando fotos" />}
      {consulta.isError && !datos && (
        <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
      )}
      {datos && datos.elementos.length === 0 && (
        <Card>
          <EstadoVacio
            icono={<CameraRegular />}
            titulo={estado === 'pendientes' ? 'No hay fotos por revisar' : 'No hay fotos'}
            descripcion={
              estado === 'pendientes'
                ? 'Cuando el modelo dude de una detección, la foto aparecerá aquí.'
                : 'Cambia el filtro para ver otras fotos.'
            }
          />
        </Card>
      )}
      {datos && datos.elementos.length > 0 && (
        <>
          <ul className={s.rejilla} aria-label="Fotos dudosas">
            {datos.elementos.map((foto) => (
              <TarjetaFoto key={foto.id} foto={foto} />
            ))}
          </ul>
          <Paginador
            pagina={datos.pagina}
            tamano={datos.tamano}
            total={datos.total}
            etiqueta="fotos"
            cargando={consulta.isFetching}
            onCambiar={(p) => cambiar({ pagina: p })}
          />
        </>
      )}
    </>
  );
}

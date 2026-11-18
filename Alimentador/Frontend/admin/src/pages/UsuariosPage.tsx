import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Card,
  Field,
  Link,
  makeStyles,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  SearchBox,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  MoreHorizontalRegular,
  PeopleRegular,
  PersonAvailableRegular,
  PersonProhibitedRegular,
  ShieldDismissRegular,
  ShieldPersonRegular,
  EyeRegular,
} from '@fluentui/react-icons';
import { admin, claves } from '../api/endpoints';
import type { UsuarioAdminDto } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BarraFiltros, useEstilosFiltros } from '../components/BarraFiltros';
import { DialogoConfirmacion } from '../components/DialogoConfirmacion';
import { Encabezado } from '../components/Encabezado';
import { AvisoDesactualizado, CargandoTabla, EstadoError, EstadoVacio } from '../components/Estados';
import { Fecha } from '../components/Fecha';
import { InsigniaAdmin, InsigniaInactivo } from '../components/Insignias';
import { useNotificar } from '../components/Notificaciones';
import { Paginador } from '../components/Paginador';
import { Tabla } from '../components/Tabla';
import type { Columna } from '../components/Tabla';
import { useAnunciar } from '../hooks/useAnunciar';
import { useBusqueda } from '../hooks/useBusqueda';
import { OcultoVisual } from '../components/OcultoVisual';
import { TAMANO_PAGINA, useParametros } from '../hooks/useParametros';
import { useTitulo } from '../hooks/useTitulo';
import { fechaCorta, numero, plural } from '../utils/formato';
import { DetalleUsuario } from './usuarios/DetalleUsuario';

const useEstilos = makeStyles({
  nombre: { display: 'flex', flexDirection: 'column', minWidth: 0, rowGap: '2px' },
  lineaNombre: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  correo: { color: tokens.colorNeutralForeground3, overflowWrap: 'anywhere' },
  insignias: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  sinRol: { color: tokens.colorNeutralForeground3 },
  numero: { fontVariantNumeric: 'tabular-nums' },
  tarjeta: { padding: 0, overflow: 'hidden' },
  contenidoTarjeta: { padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL} ${tokens.spacingVerticalM}` },
});

export type AccionUsuario =
  | { tipo: 'admin'; usuario: UsuarioAdminDto; valor: boolean }
  | { tipo: 'activo'; usuario: UsuarioAdminDto; valor: boolean };

/** Diálogo de confirmación para cambiar rol o estado; muestra el `detail` del backend si falla. */
export function ConfirmarAccionUsuario({ accion, onCerrar }: { accion: AccionUsuario | null; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const notificar = useNotificar();
  const mutacion = useMutation({
    mutationFn: (a: AccionUsuario) =>
      a.tipo === 'admin'
        ? admin.cambiarAdministrador(a.usuario.id, a.valor)
        : admin.cambiarActivo(a.usuario.id, a.valor),
    onSuccess: (_, a) => {
      void queryClient.invalidateQueries({ queryKey: claves.usuarios });
      void queryClient.invalidateQueries({ queryKey: claves.resumen });
      const n = a.usuario.nombre;
      notificar.exito(
        a.tipo === 'admin'
          ? a.valor
            ? `${n} ahora es administrador`
            : `${n} ya no es administrador`
          : a.valor
            ? `Se activó la cuenta de ${n}`
            : `Se desactivó la cuenta de ${n}`,
      );
    },
  });

  const textos = (() => {
    if (!accion) return null;
    const n = accion.usuario.nombre;
    if (accion.tipo === 'admin') {
      return accion.valor
        ? {
            titulo: `¿Hacer administrador a ${n}?`,
            cuerpo: 'Podrá entrar a este panel, cambiar roles y cuentas, publicar artefactos y lanzar actualizaciones OTA.',
            boton: 'Hacer administrador',
            peligroso: false,
          }
        : {
            titulo: `¿Quitar el rol de administrador a ${n}?`,
            cuerpo: 'Perderá el acceso a este panel de inmediato. Su cuenta y sus alimentadores no cambian.',
            boton: 'Quitar rol',
            peligroso: true,
          };
    }
    return accion.valor
      ? {
          titulo: `¿Activar la cuenta de ${n}?`,
          cuerpo: 'Podrá volver a iniciar sesión en la app y, si es administrador, en este panel.',
          boton: 'Activar cuenta',
          peligroso: false,
        }
      : {
          titulo: `¿Desactivar la cuenta de ${n}?`,
          cuerpo:
            'No podrá iniciar sesión y se cerrarán todas sus sesiones abiertas. Sus alimentadores, mascotas e historial se conservan.',
          boton: 'Desactivar cuenta',
          peligroso: true,
        };
  })();

  return (
    <DialogoConfirmacion
      abierto={accion !== null}
      titulo={textos?.titulo ?? ''}
      textoConfirmar={textos?.boton ?? ''}
      peligroso={textos?.peligroso}
      onCerrar={onCerrar}
      onConfirmar={() => (accion ? mutacion.mutateAsync(accion) : Promise.resolve())}
    >
      <Body1>{textos?.cuerpo}</Body1>
    </DialogoConfirmacion>
  );
}

function MenuAcciones({
  usuario,
  esYo,
  onDetalle,
  onAccion,
}: {
  usuario: UsuarioAdminDto;
  esYo: boolean;
  onDetalle: () => void;
  onAccion: (a: AccionUsuario) => void;
}) {
  return (
    <Menu positioning={{ autoSize: true }}>
      <MenuTrigger disableButtonEnhancement>
        <Tooltip content={`Acciones para ${usuario.nombre}`} relationship="label">
          <Button appearance="subtle" icon={<MoreHorizontalRegular />} />
        </Tooltip>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem icon={<EyeRegular />} onClick={onDetalle}>
            Ver detalle
          </MenuItem>
          {!esYo && (
            <>
              {usuario.esAdministrador ? (
                <MenuItem
                  icon={<ShieldDismissRegular />}
                  onClick={() => onAccion({ tipo: 'admin', usuario, valor: false })}
                >
                  Quitar administrador
                </MenuItem>
              ) : (
                <MenuItem
                  icon={<ShieldPersonRegular />}
                  onClick={() => onAccion({ tipo: 'admin', usuario, valor: true })}
                >
                  Hacer administrador
                </MenuItem>
              )}
              {usuario.activo ? (
                <MenuItem
                  icon={<PersonProhibitedRegular />}
                  onClick={() => onAccion({ tipo: 'activo', usuario, valor: false })}
                >
                  Desactivar cuenta
                </MenuItem>
              ) : (
                <MenuItem
                  icon={<PersonAvailableRegular />}
                  onClick={() => onAccion({ tipo: 'activo', usuario, valor: true })}
                >
                  Activar cuenta
                </MenuItem>
              )}
            </>
          )}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

export default function UsuariosPage() {
  const s = useEstilos();
  const f = useEstilosFiltros();
  useTitulo('Usuarios');
  const { sesion } = useAuth();
  const { numero: num, numeroOpcional, cambiar } = useParametros();
  const pagina = num('pagina', 1);
  const { valor: buscar, setValor: setBuscar, aplicado: buscarUrl } = useBusqueda();
  const detalleId = numeroOpcional('usuario');
  const [accion, setAccion] = useState<AccionUsuario | null>(null);

  const consulta = useQuery({
    queryKey: [...claves.usuarios, 'lista', { buscar: buscarUrl, pagina }],
    queryFn: ({ signal }) => admin.usuarios({ buscar: buscarUrl || undefined, pagina, tamano: TAMANO_PAGINA }, signal),
    placeholderData: keepPreviousData,
  });
  const datos = consulta.data;

  useAnunciar(
    datos && !consulta.isPlaceholderData
      ? buscarUrl
        ? `${plural(datos.total, 'usuario encontrado', 'usuarios encontrados')}`
        : null
      : null,
  );

  const esYo = (u: UsuarioAdminDto) => u.id === sesion?.usuarioId;

  const columnas: Columna<UsuarioAdminDto>[] = [
    {
      id: 'nombre',
      encabezado: 'Usuario',
      ancho: '30%',
      celda: (u) => (
        <div className={s.nombre}>
          <span className={s.lineaNombre}>
            <Link as="button" onClick={() => cambiar({ usuario: u.id }, { conservarPagina: true })}>
              {u.nombre}
            </Link>
            {esYo(u) && (
              <Badge appearance="outline" color="informative" size="small">
                Tú
              </Badge>
            )}
          </span>
          <Caption1 className={s.correo}>{u.email}</Caption1>
        </div>
      ),
    },
    {
      id: 'rol',
      encabezado: 'Rol y estado',
      ancho: '20%',
      celda: (u) =>
        u.esAdministrador || !u.activo ? (
          <span className={s.insignias}>
            {u.esAdministrador && <InsigniaAdmin size="small" />}
            {!u.activo && <InsigniaInactivo size="small" />}
          </span>
        ) : (
          <Caption1 className={s.sinRol}>Usuario</Caption1>
        ),
    },
    { id: 'alimentadores', encabezado: 'Alimentadores', ancho: '12%', alinear: 'end', celda: (u) => <Text className={s.numero}>{numero(u.alimentadores)}</Text> },
    { id: 'gateways', encabezado: 'Raspberry Pi', ancho: '11%', alinear: 'end', secundaria: true, celda: (u) => <Text className={s.numero}>{numero(u.gateways)}</Text> },
    { id: 'alta', encabezado: 'Alta', ancho: '12%', secundaria: true, celda: (u) => fechaCorta(u.creadoEn) },
    { id: 'acceso', encabezado: 'Último acceso', ancho: '17%', celda: (u) => <Fecha iso={u.ultimoAcceso} /> },
    {
      id: 'acciones',
      encabezado: <OcultoVisual>Acciones</OcultoVisual>,
      ancho: '56px',
      celda: (u) => (
        <MenuAcciones
          usuario={u}
          esYo={esYo(u)}
          onDetalle={() => cambiar({ usuario: u.id }, { conservarPagina: true })}
          onAccion={setAccion}
        />
      ),
    },
  ];

  return (
    <>
      <Encabezado titulo="Usuarios" descripcion="Cuentas registradas, su rol y su acceso." />

      <BarraFiltros>
        <Field label="Buscar" className={f.busqueda}>
          <SearchBox
            value={buscar}
            onChange={(_, d) => setBuscar(d.value)}
            placeholder="Nombre o correo"
          />
        </Field>
      </BarraFiltros>

      {datos && consulta.isError && <AvisoDesactualizado error={consulta.error} onReintentar={() => void consulta.refetch()} />}

      <Card className={s.tarjeta}>
        <div className={s.contenidoTarjeta}>
          {consulta.isPending && <CargandoTabla etiqueta="Cargando usuarios" />}
          {consulta.isError && !datos && (
            <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
          )}
          {datos && datos.elementos.length === 0 && (
            <EstadoVacio
              icono={<PeopleRegular />}
              titulo={buscarUrl ? 'Ningún usuario coincide' : 'Todavía no hay usuarios'}
              descripcion={buscarUrl ? `No hay resultados para “${buscarUrl}”. Prueba con otro nombre o correo.` : undefined}
              accion={
                buscarUrl ? (
                  <Button onClick={() => setBuscar('')}>Limpiar búsqueda</Button>
                ) : undefined
              }
            />
          )}
          {datos && datos.elementos.length > 0 && (
            <>
              <Tabla
                items={datos.elementos}
                columnas={columnas}
                getId={(u) => u.id}
                etiqueta="Usuarios"
                anchoMinimo={820}
              />
              <Paginador
                pagina={datos.pagina}
                tamano={datos.tamano}
                total={datos.total}
                etiqueta="usuarios"
                cargando={consulta.isFetching}
                onCambiar={(p) => cambiar({ pagina: p })}
              />
            </>
          )}
        </div>
      </Card>

      <DetalleUsuario
        id={detalleId}
        esYo={detalleId === sesion?.usuarioId}
        onCerrar={() => cambiar({ usuario: null }, { conservarPagina: true })}
        onAccion={setAccion}
      />
      <ConfirmarAccionUsuario accion={accion} onCerrar={() => setAccion(null)} />
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { Outlet, useHref, useLocation, useNavigate } from 'react-router';
import {
  Avatar,
  Badge,
  Button,
  Caption1,
  Hamburger,
  makeStyles,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  NavDrawer,
  NavDrawerBody,
  NavDrawerHeader,
  NavItem,
  NavSectionHeader,
  Text,
  tokens,
  Tooltip,
  useRestoreFocusTarget,
} from '@fluentui/react-components';
import type { MenuProps } from '@fluentui/react-components';
import {
  AnimalDogFilled,
  AnimalDogRegular,
  BoardFilled,
  BoardRegular,
  bundleIcon,
  CloudArrowDownFilled,
  CloudArrowDownRegular,
  DarkThemeRegular,
  DeveloperBoardFilled,
  DeveloperBoardRegular,
  PeopleFilled,
  PeopleRegular,
  SignOutRegular,
} from '@fluentui/react-icons';
import { MODO_DEMO } from '../api/cliente';
import { useAuth } from '../auth/AuthContext';
import { CONSULTA_ESCRITORIO, useMediaQuery } from '../hooks/useMediaQuery';
import { useTema } from '../theme/TemaContext';
import type { PreferenciaTema } from '../theme/TemaContext';

const IconoResumen = bundleIcon(BoardFilled, BoardRegular);
const IconoUsuarios = bundleIcon(PeopleFilled, PeopleRegular);
const IconoAlimentadores = bundleIcon(AnimalDogFilled, AnimalDogRegular);
const IconoEmbebidos = bundleIcon(DeveloperBoardFilled, DeveloperBoardRegular);
const IconoOta = bundleIcon(CloudArrowDownFilled, CloudArrowDownRegular);

interface Destino {
  valor: string;
  ruta: string;
  texto: string;
  icono: ReactElement;
}

const DESTINOS: Destino[] = [
  { valor: 'resumen', ruta: '/', texto: 'Resumen', icono: <IconoResumen /> },
  { valor: 'usuarios', ruta: '/usuarios', texto: 'Usuarios', icono: <IconoUsuarios /> },
  { valor: 'alimentadores', ruta: '/alimentadores', texto: 'Alimentadores y mascotas', icono: <IconoAlimentadores /> },
  { valor: 'embebidos', ruta: '/embebidos', texto: 'Embebidos', icono: <IconoEmbebidos /> },
  { valor: 'ota', ruta: '/ota', texto: 'Actualizaciones OTA', icono: <IconoOta /> },
];

const ALTO_BARRA = '48px';

const useEstilos = makeStyles({
  raiz: {
    display: 'grid',
    gridTemplateRows: `${ALTO_BARRA} minmax(0, 1fr)`,
    height: '100dvh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  saltar: {
    position: 'absolute',
    left: tokens.spacingHorizontalS,
    top: '-100px',
    zIndex: 1000,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorBrandForegroundLink,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow8,
    ':focus': { top: tokens.spacingVerticalS },
  },
  barra: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    minWidth: 0,
  },
  producto: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    '@media (max-width: 639px)': { fontSize: tokens.fontSizeBase300 },
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
  },
  separadorProducto: { color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightRegular },
  espacio: { flexGrow: 1 },
  botonCuenta: { minWidth: 'auto', paddingLeft: tokens.spacingHorizontalXS, paddingRight: tokens.spacingHorizontalXS },
  usuario: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  nombreUsuario: {
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cuerpo: { display: 'flex', minHeight: 0, minWidth: 0 },
  nav: { height: '100%', width: '260px', flexShrink: 0 },
  navOverlay: { height: '100dvh' },
  principal: {
    flexGrow: 1,
    minWidth: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    ':focus': { outline: 'none' },
  },
  contenido: {
    maxWidth: '1400px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXXL,
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    '@media (max-width: 639px)': {
      paddingTop: tokens.spacingVerticalL,
      paddingLeft: tokens.spacingHorizontalL,
      paddingRight: tokens.spacingHorizontalL,
    },
  },
  pie: {
    marginTop: 'auto',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    color: tokens.colorNeutralForeground3,
  },
});

function seccionActual(pathname: string): string {
  const primero = pathname.split('/')[1] ?? '';
  return DESTINOS.find((d) => d.ruta === `/${primero}`)?.valor ?? 'resumen';
}

function ElementoNav({ destino, onNavegar }: { destino: Destino; onNavegar: () => void }) {
  const href = useHref(destino.ruta);
  const navegar = useNavigate();
  return (
    <NavItem
      href={href}
      value={destino.valor}
      icon={destino.icono}
      onClick={(e: MouseEvent<HTMLElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navegar(destino.ruta);
        onNavegar();
      }}
    >
      {destino.texto}
    </NavItem>
  );
}

/** Marco de la app: barra superior, navegación lateral colapsable y área de contenido. */
export function Marco() {
  const s = useEstilos();
  const escritorio = useMediaQuery(CONSULTA_ESCRITORIO);
  const [abiertoEscritorio, setAbiertoEscritorio] = useState(true);
  const [abiertoMovil, setAbiertoMovil] = useState(false);
  const abierto = escritorio ? abiertoEscritorio : abiertoMovil;
  const { sesion, cerrarSesion } = useAuth();
  const { preferencia, setPreferencia } = useTema();
  const ubicacion = useLocation();
  const principal = useRef<HTMLElement>(null);
  const restaurarFoco = useRestoreFocusTarget();

  // Al cambiar de página, el foco va al contenido y el scroll vuelve arriba.
  useEffect(() => {
    principal.current?.scrollTo({ top: 0 });
  }, [ubicacion.pathname]);

  const alternar = () => (escritorio ? setAbiertoEscritorio((v) => !v) : setAbiertoMovil((v) => !v));

  const cambiarTema: MenuProps['onCheckedValueChange'] = (_, d) => {
    const v = d.checkedItems[0] as PreferenciaTema | undefined;
    if (v) setPreferencia(v);
  };

  return (
    <div className={s.raiz}>
      <a className={s.saltar} href="#contenido">
        Saltar al contenido
      </a>
      <header className={s.barra}>
        <Tooltip content={abierto ? 'Ocultar navegación' : 'Mostrar navegación'} relationship="label">
          <Hamburger onClick={alternar} aria-expanded={escritorio ? abierto : undefined} {...(escritorio ? {} : restaurarFoco)} />
        </Tooltip>
        <Text className={s.producto}>
          Alimentador <span className={s.separadorProducto} aria-hidden>·</span> Administración
        </Text>
        {MODO_DEMO && escritorio && (
          <Badge appearance="tint" color="warning" size="small">
            Demo
          </Badge>
        )}
        <span className={s.espacio} />
        {escritorio && (
        <Menu checkedValues={{ tema: [preferencia] }} onCheckedValueChange={cambiarTema} hasCheckmarks>
          <MenuTrigger disableButtonEnhancement>
            <Tooltip content="Tema" relationship="label">
              <Button appearance="subtle" icon={<DarkThemeRegular />} />
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuGroup>
                <MenuGroupHeader>Tema</MenuGroupHeader>
                <MenuItemRadio name="tema" value="sistema">
                  Igual que el sistema
                </MenuItemRadio>
                <MenuItemRadio name="tema" value="claro">
                  Claro
                </MenuItemRadio>
                <MenuItemRadio name="tema" value="oscuro">
                  Oscuro
                </MenuItemRadio>
              </MenuGroup>
            </MenuList>
          </MenuPopover>
        </Menu>
        )}
        <Menu
          positioning={{ autoSize: true }}
          checkedValues={{ tema: [preferencia] }}
          onCheckedValueChange={cambiarTema}
          hasCheckmarks={!escritorio}
        >
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" className={s.botonCuenta} aria-label={`Cuenta de ${sesion?.nombre ?? 'usuario'}`}>
              <span className={s.usuario}>
                <Avatar name={sesion?.nombre} size={28} color="colorful" aria-hidden />
                {escritorio && <span className={s.nombreUsuario}>{sesion?.nombre}</span>}
              </span>
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuGroup>
                <MenuGroupHeader>{sesion?.nombre}</MenuGroupHeader>
              </MenuGroup>
              <MenuDivider />
              {!escritorio && (
                <>
                  <MenuGroup>
                    <MenuGroupHeader>Tema</MenuGroupHeader>
                    <MenuItemRadio name="tema" value="sistema">
                      Igual que el sistema
                    </MenuItemRadio>
                    <MenuItemRadio name="tema" value="claro">
                      Claro
                    </MenuItemRadio>
                    <MenuItemRadio name="tema" value="oscuro">
                      Oscuro
                    </MenuItemRadio>
                  </MenuGroup>
                  <MenuDivider />
                </>
              )}
              <MenuItem icon={<SignOutRegular />} onClick={() => void cerrarSesion()}>
                Cerrar sesión
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </header>

      <div className={s.cuerpo}>
        <NavDrawer
          type={escritorio ? 'inline' : 'overlay'}
          open={abierto}
          onOpenChange={(_, d) => !escritorio && setAbiertoMovil(d.open)}
          selectedValue={seccionActual(ubicacion.pathname)}
          className={escritorio ? s.nav : s.navOverlay}
          aria-label="Navegación principal"
        >
          {!escritorio && (
            <NavDrawerHeader>
              <Tooltip content="Cerrar navegación" relationship="label">
                <Hamburger onClick={() => setAbiertoMovil(false)} />
              </Tooltip>
            </NavDrawerHeader>
          )}
          <NavDrawerBody>
            <NavSectionHeader>Administración</NavSectionHeader>
            {DESTINOS.map((d) => (
              <ElementoNav key={d.valor} destino={d} onNavegar={() => !escritorio && setAbiertoMovil(false)} />
            ))}
          </NavDrawerBody>
          <Caption1 className={s.pie}>Alimentador Inteligente</Caption1>
        </NavDrawer>

        <main id="contenido" ref={principal} className={s.principal} tabIndex={-1}>
          <div className={s.contenido}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

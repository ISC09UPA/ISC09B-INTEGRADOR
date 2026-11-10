/**
 * Estado global de la app (Context API).
 *
 * Centraliza sesión, conectividad, lecturas, riego, plantas, alertas,
 * galería y preferencias. Las pantallas consumen `useApp()` y nunca
 * hablan directamente con los servicios (solo a través de las acciones).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { MES_MOCK } from '../data/mock';
import * as authService from '../services/authService';
import * as sensorsService from '../services/sensorsService';
import * as wateringService from '../services/wateringService';
import * as plantsService from '../services/plantsService';
import * as alertsService from '../services/alertsService';
import * as galleryService from '../services/galleryService';
import * as profileService from '../services/profileService';

const AppContext = createContext(null);

/** Intervalo de sondeo de lecturas (ms). Equivale al polling de la API. */
const INTERVALO_SONDEO = 30000;

const estadoInicial = {
  // Sesión
  sesion: null, // { token, usuario }
  restaurando: true,

  // Conectividad
  conectividad: {
    internet: true, // false => «Modo sin conexión» + control local
    raspberryEnLinea: true,
    ultimaSincronizacion: null, // Date | null
  },

  // Datos del invernadero
  plantaActivaId: null,
  plantas: [],
  dispositivo: null,
  lecturas: null, // { suelo, temperatura, ambiente, luminosidad, actualizadoEn }
  lecturasCargando: true,
  lecturasError: null,

  riego: null, // { automatico, umbral, manualSegundos, bomba }
  riegoCargando: true,

  alertas: [],

  galeria: { fotos: [], fotoPlanta: null },
  galeriaCargando: true,

  // Riego: consumo semanal y eventos del mes seleccionado
  consumo: null, // { totalLitros, variacion, dias }
  eventosRiego: [],
  mesEventos: MES_MOCK,
  eventosRiegoCargando: false,

  // Historial de sensores (periodo seleccionado)
  historial: { periodo: '7d', datos: null, cargando: false },

  perfil: null,
  preferencias: null,
  notificaciones: null,
  guia: null,

  toast: null, // { tipo: 'exito' | 'error' | 'info', mensaje }
};

export function AppProvider({ children }) {
  const [state, setState] = useState(estadoInicial);
  const toastTimer = useRef(null);

  /* ----------------------------- Toast ----------------------------- */
  const mostrarToast = useCallback((tipo, mensaje) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setState((prev) => ({ ...prev, toast: { tipo, mensaje } }));
    // El toast se oculta solo a los 3.5 s.
    toastTimer.current = setTimeout(() => {
      setState((prev) => ({ ...prev, toast: null }));
    }, 3500);
  }, []);

  /* --------------------- Carga inicial y sesión -------------------- */
  /** Carga todos los datos iniciales tras iniciar sesión. */
  const cargarDatosIniciales = useCallback(async () => {
    setState((prev) => ({ ...prev, lecturasCargando: true }));
    try {
      const [lecturas, riego, plantasData, alertas, galeria, perfil, preferencias, dispositivo, consumo, eventosRiego, notificaciones] =
        await Promise.all([
          sensorsService.obtenerLecturas(),
          wateringService.obtenerEstado(),
          plantsService.listarPlantas(),
          alertsService.listarAlertas(),
          galleryService.listarFotos(),
          profileService.obtenerPerfil(),
          profileService.obtenerPreferencias(),
          plantsService.obtenerDispositivo(),
          wateringService.obtenerConsumo(),
          wateringService.obtenerEventos(MES_MOCK),
          profileService.obtenerNotificaciones(),
        ]);

      setState((prev) => ({
        ...prev,
        lecturas,
        lecturasCargando: false,
        lecturasError: null,
        riego,
        riegoCargando: false,
        plantas: plantasData.plantas,
        plantaActivaId: plantasData.plantaActivaId,
        dispositivo,
        alertas,
        galeria,
        galeriaCargando: false,
        consumo,
        eventosRiego,
        mesEventos: MES_MOCK,
        eventosRiegoCargando: false,
        perfil,
        preferencias,
        notificaciones,
        conectividad: {
          ...prev.conectividad,
          raspberryEnLinea: dispositivo.enLinea,
          ultimaSincronizacion: new Date(),
        },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        lecturasCargando: false,
        riegoCargando: false,
        galeriaCargando: false,
        eventosRiegoCargando: false,
        lecturasError: error.message,
      }));
      mostrarToast('error', 'No se pudieron cargar los datos. Desliza para reintentar.');
    }
  }, [mostrarToast]);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const sesion = await authService.restaurarSesion();
      if (!activo) return;
      setState((prev) => ({ ...prev, sesion, restaurando: false }));

      if (sesion) {
        await cargarDatosIniciales();
      }
    }
    cargar();

    return () => {
      activo = false;
    };
  }, [cargarDatosIniciales]);

  /* ------------------- Conectividad (NetInfo) ---------------------- */
  useEffect(() => {
    const desuscribir = NetInfo.addEventListener((estado) => {
      const internet = estado.isConnected !== false;
      setState((prev) => ({
        ...prev,
        conectividad: { ...prev.conectividad, internet },
      }));
    });
    return desuscribir;
  }, []);

  /* ------------------ Sondeo de lecturas (polling) ----------------- */
  useEffect(() => {
    if (!state.sesion) return undefined;
    const intervalo = setInterval(async () => {
      try {
        const lecturas = await sensorsService.obtenerLecturas();
        setState((prev) => ({
          ...prev,
          lecturas,
          conectividad: { ...prev.conectividad, ultimaSincronizacion: new Date() },
        }));
      } catch {
        // Si falla el sondeo, la pantalla conserva la última lectura.
      }
    }, INTERVALO_SONDEO);
    return () => clearInterval(intervalo);
  }, [state.sesion]);

  /* ------------- Cuenta regresiva de la bomba («Regando…») --------- */
  const estadoBomba = state.riego?.bomba?.estado;

  useEffect(() => {
    if (estadoBomba !== 'regando') return undefined;
    const intervalo = setInterval(() => {
      setState((prev) => {
        if (!prev.riego || prev.riego.bomba.estado !== 'regando') return prev;
        const restante = prev.riego.bomba.segundosRestantes - 1;
        if (restante > 0) {
          return {
            ...prev,
            riego: {
              ...prev.riego,
              bomba: { ...prev.riego.bomba, segundosRestantes: restante },
            },
          };
        }
        // Terminó el riego: la bomba vuelve a «Lista para regar».
        clearInterval(intervalo);
        return {
          ...prev,
          riego: {
            ...prev.riego,
            bomba: { ...prev.riego.bomba, estado: 'ready', segundosRestantes: 0 },
          },
        };
      });
    }, 1000);
    return () => clearInterval(intervalo);
  }, [estadoBomba]);

  /* ------------------------- Acciones ----------------------------- */
  const acciones = useMemo(() => {
    /** Inicia sesión con las credenciales del formulario. */
    async function iniciarSesion(email, contrasena) {
      const sesion = await authService.iniciarSesion(email, contrasena);
      setState((prev) => ({ ...prev, sesion }));
      await cargarDatosIniciales();
      return sesion;
    }

    /** Registra una cuenta nueva e inicia sesión automáticamente. */
    async function registrar(datos) {
      const sesion = await authService.registrar(datos);
      setState((prev) => ({ ...prev, sesion }));
      await cargarDatosIniciales();
      return sesion;
    }

    /** Cierra la sesión y vuelve a Login. */
    async function cerrarSesion() {
      await authService.cerrarSesion();
      setState((prev) => ({ ...prev, sesion: null }));
    }

    /** Fuerza una resincronización con la Raspberry Pi (pull-to-refresh). */
    async function sincronizar() {
      await cargarDatosIniciales();
    }

    /** Alterna el riego automático por humedad del suelo. */
    async function alternarRiegoAutomatico(automatico) {
      const riego = await wateringService.alternarAutomatico(automatico);
      setState((prev) => ({ ...prev, riego }));
      return riego;
    }

    /** Ajusta el umbral de humedad (se guarda al soltar el slider). */
    async function ajustarUmbral(umbral) {
      const riego = await wateringService.ajustarUmbral(umbral);
      setState((prev) => ({ ...prev, riego }));
      return riego;
    }

    /** Cambia la duración del riego manual (stepper local). */
    function fijarDuracionManual(segundos) {
      setState((prev) => ({
        ...prev,
        riego: prev.riego ? { ...prev.riego, manualSegundos: segundos } : prev.riego,
      }));
    }

    /** Envía la orden de riego manual a la Raspberry Pi. */
    async function iniciarRiego(segundos) {
      const resultado = await wateringService.iniciarRiego(segundos);
      const { evento, ...riego } = resultado;
      setState((prev) => ({
        ...prev,
        riego,
        // Si el mes seleccionado coincide, el evento nuevo se antepone a la lista.
        eventosRiego:
          evento && evento.mes === prev.mesEventos ? [evento, ...prev.eventosRiego] : prev.eventosRiego,
      }));
      return riego;
    }

    /** Detiene la bomba en pleno riego. */
    async function detenerRiego() {
      const riego = await wateringService.detenerRiego();
      setState((prev) => ({ ...prev, riego }));
      return riego;
    }

    /** Recarga los eventos de riego del mes indicado (1-12). */
    async function cargarEventosRiego(mes) {
      setState((prev) => ({ ...prev, eventosRiegoCargando: true }));
      try {
        const eventos = await wateringService.obtenerEventos(mes);
        setState((prev) => ({
          ...prev,
          eventosRiego: eventos,
          mesEventos: mes,
          eventosRiegoCargando: false,
        }));
        return eventos;
      } catch (error) {
        setState((prev) => ({ ...prev, eventosRiegoCargando: false }));
        mostrarToast('error', error.message);
        return [];
      }
    }

    /** Carga la serie histórica de sensores del periodo: '24h' | '7d' | '30d'. */
    async function cargarHistorial(periodo) {
      setState((prev) => ({
        ...prev,
        historial: { ...prev.historial, cargando: true, periodo },
      }));
      try {
        const datos = await sensorsService.obtenerHistorial(periodo);
        setState((prev) => ({
          ...prev,
          historial: { periodo, datos, cargando: false },
        }));
        return datos;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          historial: { ...prev.historial, cargando: false },
        }));
        mostrarToast('error', error.message);
        return null;
      }
    }

    /** Marca todas las alertas como leídas. */
    async function marcarAlertasLeidas() {
      const alertas = await alertsService.marcarTodasLeidas();
      setState((prev) => ({ ...prev, alertas }));
      return alertas;
    }

    /** Crea una nueva planta y la agrega a la lista. */
    async function crearPlanta(datos) {
      const planta = await plantsService.crearPlanta(datos);
      setState((prev) => ({
        ...prev,
        plantas: [...prev.plantas, planta],
        plantaActivaId: planta.id,
      }));
      return planta;
    }

    /** Cambia la planta activa (pestaña Planta). */
    async function activarPlanta(id) {
      await plantsService.activarPlanta(id);
      setState((prev) => ({ ...prev, plantaActivaId: id }));
    }

    /** Toma una nueva foto (cámara del invernadero / teléfono). */
    async function agregarFoto() {
      const { foto, fotoPlanta } = await galleryService.agregarFoto();
      setState((prev) => ({
        ...prev,
        galeria: {
          fotos: [foto, ...prev.galeria.fotos],
          fotoPlanta,
        },
      }));
      return foto;
    }

    /** Actualiza los datos del perfil (y la sesión, para el saludo de Inicio). */
    async function actualizarPerfil(datos) {
      const perfil = await profileService.actualizarPerfil(datos);
      setState((prev) => ({
        ...prev,
        perfil,
        sesion: prev.sesion
          ? {
              ...prev.sesion,
              usuario: {
                ...prev.sesion.usuario,
                nombre: perfil.nombreCompleto.split(' ')[0],
                nombreCompleto: perfil.nombreCompleto,
                email: perfil.email,
              },
            }
          : prev.sesion,
      }));
      return perfil;
    }

    /** Actualiza las preferencias (unidades, idioma, tema). */
    async function actualizarPreferencias(datos) {
      const preferencias = await profileService.actualizarPreferencias(datos);
      setState((prev) => ({ ...prev, preferencias }));
      return preferencias;
    }

    /** Actualiza la configuración de notificaciones. */
    async function actualizarNotificaciones(datos) {
      const notificaciones = await profileService.actualizarNotificaciones(datos);
      setState((prev) => ({ ...prev, notificaciones }));
      return notificaciones;
    }

    /** Carga el contenido de la guía de soporte. */
    async function cargarGuia() {
      try {
        const guia = await profileService.obtenerGuia();
        setState((prev) => ({ ...prev, guia }));
        return guia;
      } catch (error) {
        mostrarToast('error', error.message);
        return null;
      }
    }

    /** Elimina una foto de la galería. */
    async function eliminarFoto(id) {
      await galleryService.eliminarFoto(id);
      setState((prev) => ({
        ...prev,
        galeria: {
          ...prev.galeria,
          fotos: prev.galeria.fotos.filter((foto) => foto.id !== id),
        },
      }));
    }

    return {
      iniciarSesion,
      registrar,
      cerrarSesion,
      sincronizar,
      alternarRiegoAutomatico,
      ajustarUmbral,
      fijarDuracionManual,
      iniciarRiego,
      detenerRiego,
      cargarEventosRiego,
      cargarHistorial,
      marcarAlertasLeidas,
      crearPlanta,
      activarPlanta,
      agregarFoto,
      actualizarPerfil,
      actualizarPreferencias,
      actualizarNotificaciones,
      cargarGuia,
      eliminarFoto,
      mostrarToast,
    };
  }, [mostrarToast, cargarDatosIniciales]);

  const valor = useMemo(
    () => ({
      ...state,
      ...acciones,
      // Derivados útiles para las pantallas
      plantaActiva: state.plantas.find((p) => p.id === state.plantaActivaId) ?? null,
      alertasActivas: state.alertas.filter((a) => !a.leida).length,
      modoSinConexion: !state.conectividad.internet,
    }),
    [state, acciones],
  );

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}

/** Hook para consumir el estado global desde cualquier pantalla. */
export function useApp() {
  const contexto = useContext(AppContext);
  if (!contexto) {
    throw new Error('useApp debe usarse dentro de <AppProvider>');
  }
  return contexto;
}

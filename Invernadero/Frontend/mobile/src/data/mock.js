/**
 * Datos mock de la app, tomados de la sección «Datos de ejemplo» del documento
 * de especificación. Viven en una «base de datos» en memoria (ver services/api.js)
 * y son la única fuente de verdad del front hasta conectar el backend real.
 */

/**
 * Mes en el que transcurren los datos de ejemplo (junio, según los mockups:
 * «12 jun», «10 jun», filtro «Junio»…). Los riegos nuevos se registran
 * en este mes para que todo el historial sea coherente.
 */
export const MES_MOCK = 6;

/** Nombres de los meses para el selector de «Eventos recientes». */
export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Usuario administrador de ejemplo. */
export const USUARIO = {
  id: 'u1',
  nombre: 'Mariana',
  nombreCompleto: 'Mariana Ríos',
  email: 'mariana@invernadero.app',
  contrasena: 'invernadero123', // Solo para el mock de autenticación
  rol: 'Administrador',
};

/** Dispositivo Raspberry Pi vinculado. */
export const DISPOSITIVO = {
  id: 'd1',
  nombre: 'Raspberry Pi 4',
  identificador: 'GH-001',
  firmware: 'v1.8.2',
  estado: 'Actualizado',
  activo: true,
  enLinea: true,
};

/** Plantas registradas (la primera es la planta activa). */
export const PLANTAS = [
  {
    id: 'p1',
    nombre: 'Tomate Cherry',
    especie: 'Solanum lycopersicum',
    ubicacion: 'Invernadero principal',
    enLinea: true,
    dispositivoId: 'd1',
    // Color base para simular la foto mientras no haya imagen real
    colorFoto: '#7CB24F',
  },
  {
    id: 'p2',
    nombre: 'Albahaca Genovesa',
    especie: 'Ocimum basilicum',
    ubicacion: 'Módulo de prueba',
    enLinea: false,
    dispositivoId: null,
    colorFoto: '#4E9A6A',
  },
];

/** Lecturas actuales de los sensores (valores del mockup). */
export const LECTURAS = {
  suelo: { valor: 68, unidad: '%' },
  temperatura: { valor: 24.5, unidad: '°C' },
  ambiente: { valor: 72, unidad: '%' },
  luminosidad: { valor: 8420, unidad: 'lux' },
};

/** Rangos ideales por sensor, para calcular los chips de estado. */
export const RANGOS_IDEALES = {
  suelo: { min: 40, max: 80, unidad: '%' },
  temperatura: { min: 18, max: 30, unidad: '°C' },
  ambiente: { min: 40, max: 70, unidad: '%' },
  luminosidad: { min: 5000, max: 30000, unidad: 'lux' },
};

/** Configuración y estado del riego. */
export const RIEGO = {
  automatico: true,
  umbral: 45, // % de humedad del suelo
  umbralMin: 25,
  umbralMax: 75,
  manualSegundos: 30, // Duración por defecto del riego manual
  manualMin: 5, // Mínimo sugerido (s)
  manualMax: 120, // Máximo (2 min)
  manualPaso: 5,
  bomba: {
    nombre: 'Bomba principal',
    estado: 'ready', // 'ready' | 'regando' | 'desconectada' | 'error'
    segundosRestantes: 0,
  },
};

/** Consumo semanal y variación contra la semana anterior. */
export const CONSUMO_SEMANAL = {
  totalLitros: 8.4,
  variacion: -12, // % contra la semana anterior (negativo = bajó)
  dias: [
    { etiqueta: 'L', litros: 1.1 },
    { etiqueta: 'M', litros: 0.7 },
    { etiqueta: 'X', litros: 1.5 },
    { etiqueta: 'J', litros: 0.9 },
    { etiqueta: 'V', litros: 1.8 },
    { etiqueta: 'S', litros: 1.2 },
    { etiqueta: 'D', litros: 1.2 },
  ],
};

/** Eventos de riego recientes (junio). */
export const EVENTOS_RIEGO = [
  {
    id: 'e1',
    tipo: 'Automático',
    fechaEtiqueta: 'Hoy, 08:30',
    mes: 6,
    duracion: '30 s',
    litros: '0.8 L',
  },
  {
    id: 'e2',
    tipo: 'Manual',
    fechaEtiqueta: 'Ayer, 18:15',
    mes: 6,
    duracion: '45 s',
    litros: '1.2 L',
  },
  {
    id: 'e3',
    tipo: 'Automático',
    fechaEtiqueta: '12 jun, 07:45',
    mes: 6,
    duracion: '30 s',
    litros: '0.8 L',
  },
  {
    id: 'e4',
    tipo: 'Fallido',
    fechaEtiqueta: '10 jun, 19:10',
    mes: 6,
    duracion: '–',
    litros: '–',
  },
];

/** Alertas recientes (severidad: alta | media | info). */
export const ALERTAS = [
  {
    id: 'a1',
    severidad: 'media',
    titulo: 'Humedad baja',
    descripcion: 'El suelo bajó del umbral configurado (45%).',
    fechaEtiqueta: 'Hace 12 min',
    leida: false,
    icono: 'droplet',
  },
  {
    id: 'a2',
    severidad: 'alta',
    titulo: 'Temperatura alta',
    descripcion: 'Se registraron 31.2 °C durante 15 minutos.',
    fechaEtiqueta: 'Ayer, 15:40',
    leida: false,
    icono: 'thermometer',
  },
  {
    id: 'a3',
    severidad: 'info',
    titulo: 'Dispositivo sin conexión',
    descripcion: 'La Raspberry Pi estuvo sin conexión durante 8 min.',
    fechaEtiqueta: '10 jun, 22:16',
    leida: false,
    icono: 'wifi-off',
  },
];

/**
 * Galería de fotos de seguimiento (24 imágenes, como indica el menú Más).
 * Al no haber fotos reales, cada elemento define un tono de verde
 * para renderizar una «foto» simulada (bloque con degradado).
 */
const COLORES_FOTOS = ['#5E9B47', '#4E8A6A', '#6FAE55', '#3F7D5C', '#7CB24F', '#57A06D'];
const ETIQUETAS_FOTOS = ['Hoy'];
for (let dia = 8; dia <= 30; dia++) {
  ETIQUETAS_FOTOS.push(`${dia} jun`);
}

export const GALERIA = ETIQUETAS_FOTOS.map((etiqueta, i) => ({
  id: `f${i + 1}`,
  etiqueta,
  color: COLORES_FOTOS[i % COLORES_FOTOS.length],
}));

/** Fecha/hora de la foto más reciente de la planta (mockup: «Hoy, 10:38»). */
export const FOTO_PLANTA = { etiqueta: 'Hoy, 10:38', color: '#7CB24F' };

/**
 * Genera una serie pseudoaleatoria pero estable (misma semilla = misma serie)
 * para las gráficas de historial. Usa senos superpuestos para que luzca natural.
 */
function generarSerie(n, base, amplitud, semilla) {
  const serie = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(n - 1, 1);
    const onda =
      Math.sin(t * Math.PI * 2 + semilla) * 0.55 +
      Math.sin(t * Math.PI * 5 + semilla * 1.7) * 0.25 +
      Math.sin(t * Math.PI * 11 + semilla * 0.6) * 0.1;
    serie.push(Number((base + onda * amplitud).toFixed(1)));
  }
  return serie;
}

/** Historial de sensores por periodo (24 h / 7 días / 30 días). */
export const HISTORIAL_SENSORES = {
  '24h': {
    etiquetas: ['00:00', '06:00', '12:00', '18:00', 'Ahora'],
    suelo: generarSerie(24, 65, 9, 1.2),
    temperatura: generarSerie(24, 24, 3.5, 2.4),
    luminosidad: generarSerie(24, 7800, 4200, 3.1),
    ambiente: generarSerie(24, 70, 6, 0.9),
  },
  '7d': {
    // Etiquetas del mockup: solo 4 puntos distribuidos en el eje X.
    etiquetas: ['Lun', 'Mié', 'Vie', 'Hoy'],
    // Series calibradas para que mínimo/promedio/máximo coincidan con
    // los valores del mockup (52/65/78 %, 19/24/29 °, 1.2/7.6/12 k lux)
    // y el último punto sea la lectura actual de Inicio.
    suelo: [52, 60, 74, 66, 78, 57, 68],
    temperatura: [19, 22, 26, 29, 24, 23.5, 24.5],
    luminosidad: [1200, 5800, 8900, 12000, 7400, 9500, 8400],
    ambiente: [58, 64, 77, 81, 69, 69, 72],
  },
  '30d': {
    etiquetas: ['1', '8', '15', '22', '30'],
    suelo: generarSerie(30, 65, 12, 1.2),
    temperatura: generarSerie(30, 24, 5, 2.4),
    luminosidad: generarSerie(30, 7600, 5000, 3.1),
    ambiente: generarSerie(30, 70, 8, 0.9),
  },
};

/** Estadísticas de cada tarjeta del historial (mínimo / promedio / máximo). */
export const ESTADISTICAS_HISTORIAL = {
  suelo: { minimo: '52%', promedio: '65%', maximo: '78%', variacion: '4.2%' },
  temperatura: { minimo: '19°', promedio: '24°', maximo: '29°', variacion: '1.8%' },
  luminosidad: { minimo: '1.2k', promedio: '7.6k', maximo: '12k', variacion: '3.4%' },
  ambiente: { minimo: '58%', promedio: '70%', maximo: '81%', variacion: '2.1%' },
};

/** Perfil y preferencias de ejemplo. */
export const PERFIL = {
  nombreCompleto: 'Mariana Ríos',
  email: 'mariana@invernadero.app',
  rol: 'Administrador',
  rolDescripcion: 'Puede gestionar plantas, dispositivos y usuarios.',
};

export const PREFERENCIAS = {
  unidades: '°C y litros',
  idioma: 'Español',
  tema: 'Claro',
};

export const NOTIFICACIONES = {
  humedadBaja: true,
  temperaturaAlta: true,
  desconexion: true,
  recordatorios: true,
};

/** Contenido de la guía de soporte (por definir; texto provisional). */
export const GUIA_SOPORTE = {
  titulo: 'Guía de conexión y diagnóstico',
  secciones: [
    {
      titulo: 'Conectar la Raspberry Pi',
      texto:
        'Conecta el dispositivo GH-001 a la red local del invernadero y verifica que la luz de estado quede en verde fijo.',
    },
    {
      titulo: 'Diagnóstico de sensores',
      texto:
        'Desde Plantas y dispositivos revisa el estado del firmware. Si un sensor no reporta lecturas, reinicia el dispositivo y espera 2 minutos.',
    },
  ],
};

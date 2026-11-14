// Cómo se muestran en pantalla los datos que manda el back.
// El back manda fechas en UTC (ISO) y duraciones en minutos.

const DIAS_CORTOS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const dosDigitos = (n) => String(n).padStart(2, '0');

/** "2026-11-10T15:42:00Z" → "09:42" (hora del celular). */
export function hora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

/** → { dia: "23", diaSemana: "VIE" } para la columna de fecha del historial. */
export function diaYSemana(iso) {
  const d = new Date(iso);
  return { dia: String(d.getDate()), diaSemana: DIAS_CORTOS[d.getDay()] };
}

/** → "Viernes 23 oct" */
export function fechaLarga(iso) {
  const d = new Date(iso);
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** 78 → "1 h 18 min"; 45 → "45 min" */
export function duracion(minutos) {
  if (minutos === null || minutos === undefined) return '';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** 95 → "1:35" (horas:minutos, para las tarjetas de promedio). */
export function horasMinutos(minutos) {
  if (!minutos) return '0:00';
  return `${Math.floor(minutos / 60)}:${dosDigitos(minutos % 60)}`;
}

/** "2026-10" → "oct" */
export function mesCorto(mes) {
  const numero = Number(mes?.split('-')[1]);
  return MESES[numero - 1] ?? '';
}

/** 3 → "C3"; null → "—" */
export function cajonCorto(numero) {
  return numero ? `C${numero}` : '—';
}

// Tipos de vehículo: el back usa "Camion" sin acento; en pantalla se muestra con acento.
export const TIPOS_VEHICULO = [
  { valor: 'Carro', etiqueta: 'Carro', icono: 'car-outline' },
  { valor: 'Camioneta', etiqueta: 'Camioneta', icono: 'car-sport-outline' },
  { valor: 'Moto', etiqueta: 'Moto', icono: 'bicycle-outline' },
  { valor: 'Camion', etiqueta: 'Camión', icono: 'bus-outline' },
];

export function etiquetaTipo(tipo) {
  if (tipo === 'Desconocido') return 'Tipo desconocido';
  return TIPOS_VEHICULO.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
}

export function iconoTipo(tipo) {
  return TIPOS_VEHICULO.find((t) => t.valor === tipo)?.icono ?? 'car-outline';
}

// Por qué el back abrió o negó la pluma (MotivoDecision).
export const MOTIVOS = {
  EntradaPermitida: 'Entrada registrada',
  SalidaRegistrada: 'Salida registrada',
  EstacionamientoLleno: 'Estacionamiento lleno: se negó la entrada',
  LecturaRepetida: 'Esa placa se acaba de registrar; se ignoró la lectura repetida',
};

// Tipos de alerta (TipoAlerta).
export const TITULOS_ALERTA = {
  EntradaNegada: 'Entrada negada',
  PlacaNoLegible: 'Placa no legible',
  CajonSinSalida: 'Auto sin cajón',
};

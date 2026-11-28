/**
 * Utilidades de formato: saludos, fechas, unidades y plurales.
 * Mantienen los textos con el formato exacto de los mockups.
 */

/** Saludo según la hora del día («Buenos días,», «Buenas tardes,»…). */
export function saludoPorHora(fecha = new Date()) {
  const hora = fecha.getHours();
  if (hora < 12) return 'Buenos días,';
  if (hora < 19) return 'Buenas tardes,';
  return 'Buenas noches,';
}

/** Hora corta HH:MM (ej. «10:42»). */
export function horaCorta(fecha = new Date()) {
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Lux en formato compacto (8420 → «8.4k»). */
export function luxCompacto(lux) {
  if (lux >= 1000) return `${(lux / 1000).toFixed(1)}k`;
  return String(Math.round(lux));
}

/** Lux en formato completo con separador de miles (8420 → «8,420»). */
export function luxCompleto(lux) {
  return Math.round(lux)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Litros con un decimal (8.4 → «8.4 L»). */
export function formatearLitros(litros) {
  return `${litros.toFixed(1)} L`;
}

/** Iniciales para el avatar (ej. «Mariana Ríos» → «MR»). */
export function iniciales(nombreCompleto) {
  return nombreCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/** Elige singular o plural según la cantidad (ej. «1 alerta activa», «3 alertas activas»). */
export function plural(cantidad, singular, pluralTexto) {
  return cantidad === 1 ? singular : pluralTexto;
}

/** Texto relativo sencillo para minutos transcurridos («Hace 2 min», «Ahora»). */
export function haceMinutos(minutos) {
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${Math.round(minutos)} min`;
  const horas = Math.floor(minutos / 60);
  return `Hace ${horas} h`;
}

/**
 * Cálculo del estado de la planta y de cada lectura según los rangos
 * ideales de la especie.
 *
 * Reglas (reproducen los mockups con los datos de ejemplo):
 *  - Lectura dentro del rango → «Ideal» (verde).
 *  - Fuera del rango hasta 20 % del ancho del rango → «Alta»/«Baja» (amarillo).
 *  - Más allá → «Crítica» (rojo).
 *  - Estado global: «Crítico» si hay alguna lectura crítica;
 *    «Atención» si hay 2 o más lecturas fuera de rango;
 *    «Saludable» en los demás casos (una sola lectura «Alta» no degrada
 *    el estado global, tal como muestran los mockups: ambiente 72 % = Alta
 *    pero la planta se mantiene «Saludable»/«Óptima»).
 */
import { RANGOS_IDEALES } from '../data/mock';

const TOLERANCIA = 0.2;

/** Estado de una lectura individual comparada con su rango ideal. */
export function estadoSensor(valor, rango) {
  const ancho = rango.max - rango.min;
  if (valor < rango.min) {
    const desvio = (rango.min - valor) / ancho;
    return desvio > TOLERANCIA
      ? { etiqueta: 'Crítica', tone: 'danger', estado: 'critica' }
      : { etiqueta: 'Baja', tone: 'warning', estado: 'baja' };
  }
  if (valor > rango.max) {
    const desvio = (valor - rango.max) / ancho;
    return desvio > TOLERANCIA
      ? { etiqueta: 'Crítica', tone: 'danger', estado: 'critica' }
      : { etiqueta: 'Alta', tone: 'warning', estado: 'alta' };
  }
  return { etiqueta: 'Ideal', tone: 'success', estado: 'ideal' };
}

/** Estado de una lectura por clave de sensor ('suelo', 'temperatura'…). */
export function estadoLectura(clave, valor) {
  const rango = RANGOS_IDEALES[clave];
  if (!rango) return { etiqueta: 'Ideal', tone: 'success', estado: 'ideal' };
  return estadoSensor(valor, rango);
}

/** Estado global de la planta a partir del objeto de lecturas actuales. */
export function estadoPlanta(lecturas) {
  const resultados = Object.entries(lecturas)
    .filter(([clave]) => RANGOS_IDEALES[clave])
    .map(([clave, lectura]) => estadoLectura(clave, lectura.valor));

  const criticas = resultados.filter((r) => r.estado === 'critica').length;
  const desviadas = resultados.filter((r) => r.estado === 'alta' || r.estado === 'baja').length;

  if (criticas > 0) return { etiqueta: 'Crítico', tone: 'danger', estado: 'critico' };
  if (desviadas >= 2) return { etiqueta: 'Atención', tone: 'warning', estado: 'atencion' };
  return { etiqueta: 'Saludable', tone: 'success', estado: 'saludable' };
}

/** Nombre corto de la planta en minúsculas («Tomate Cherry» → «tomate»). */
export function nombreCorto(nombreCompleto) {
  const partes = String(nombreCompleto ?? '').trim().split(/\s+/);
  return (partes[0] ?? 'planta').toLowerCase();
}

/** Título y subtítulo de la tarjeta hero según el estado de la planta. */
export function textosHero(estado, nombrePlanta) {
  const nombre = nombreCorto(nombrePlanta);
  switch (estado) {
    case 'critico':
      return {
        titulo: `Tu ${nombre} está en riesgo`,
        subtitulo: 'Hay niveles críticos que requieren tu atención.',
      };
    case 'atencion':
      return {
        titulo: `Tu ${nombre} necesita atención`,
        subtitulo: 'Algunos niveles están fuera del rango ideal.',
      };
    default:
      return {
        titulo: `Tu ${nombre} está creciendo bien`,
        subtitulo: 'Todos los niveles están dentro del rango ideal.',
      };
  }
}

/**
 * Gráfica de área suavizada (evolución de sensores): curva con relleno
 * degradado, etiquetas en el eje X y tooltip al tocar la gráfica (sugerido).
 */
import React, { useId, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, spacing } from '../../theme';

const PADDING_IZQ = 6;
const PADDING_DER = 6;
const PADDING_SUP = 18; // Espacio para la burbuja del tooltip
const PADDING_INF = 20; // Espacio para las etiquetas del eje X

/**
 * Convierte los puntos en un trazado suavizado con splines Catmull-Rom
 * (misma técnica que usan las librerías de gráficas).
 */
function trazadoSuavizado(puntos) {
  if (puntos.length === 0) return '';
  if (puntos.length === 1) return `M ${puntos[0].x} ${puntos[0].y}`;
  let d = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function AreaChart({
  series = [], // Valores numéricos en orden cronológico
  labels = [], // Etiquetas del eje X distribuidas uniformemente
  height = 120,
  color = colors.soil,
  formatoValor = (v) => String(v),
  style,
}) {
  const [ancho, setAncho] = useState(0);
  const [seleccionado, setSeleccionado] = useState(null); // Índice seleccionado
  const gradienteId = useId().replace(/[^a-zA-Z0-9]/g, '');

  const geometria = useMemo(() => {
    const n = series.length;
    if (!n || ancho === 0) return null;

    const anchoInterno = ancho - PADDING_IZQ - PADDING_DER;
    const altoGrafico = height - PADDING_SUP - PADDING_INF;
    const min = Math.min(...series);
    const max = Math.max(...series);
    // Margen vertical para que la curva no toque los bordes.
    const rango = max - min || 1;
    const pMin = min - rango * 0.15;
    const pMax = max + rango * 0.15;

    const puntos = series.map((valor, i) => ({
      x: PADDING_IZQ + (anchoInterno * i) / (n - 1),
      y: PADDING_SUP + (1 - (valor - pMin) / (pMax - pMin)) * altoGrafico,
      valor,
    }));

    return { anchoInterno, altoGrafico, puntos, pMin, pMax };
  }, [series, ancho, height]);

  if (!geometria) {
    return <View style={[styles.contenedor, { height }, style]} onLayout={(e) => setAncho(e.nativeEvent.layout.width)} />;
  }

  const { anchoInterno, altoGrafico, puntos } = geometria;
  const linea = trazadoSuavizado(puntos);
  const area = `${linea} L ${puntos[puntos.length - 1].x} ${PADDING_SUP + altoGrafico} L ${puntos[0].x} ${PADDING_SUP + altoGrafico} Z`;
  const baseY = PADDING_SUP + altoGrafico;
  const lineasGuia = [0, 0.5, 1];

  return (
    <View
      style={[styles.contenedor, { height }, style]}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
    >
      <Svg width={ancho} height={height}>
        <Defs>
          <LinearGradient id={`area${gradienteId}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Líneas de guía horizontales */}
        {lineasGuia.map((fraccion) => {
          const y = PADDING_SUP + altoGrafico * fraccion;
          return (
            <Rect
              key={`guia-${fraccion}`}
              x={PADDING_IZQ}
              y={y}
              width={anchoInterno}
              height={1}
              fill={colors.border}
            />
          );
        })}

        {/* Relleno degradado y curva */}
        <Path d={area} fill={`url(#area${gradienteId})`} />
        <Path d={linea} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />

        {/* Tooltip del punto seleccionado */}
        {seleccionado !== null && puntos[seleccionado] ? (
          <>
            <Line
              x1={puntos[seleccionado].x}
              y1={PADDING_SUP}
              x2={puntos[seleccionado].x}
              y2={baseY}
              stroke={colors.textTertiary}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <Circle
              cx={puntos[seleccionado].x}
              cy={puntos[seleccionado].y}
              r={4}
              fill={color}
              stroke={colors.white}
              strokeWidth={2}
            />
            <ValorTooltip
              x={puntos[seleccionado].x}
              y={puntos[seleccionado].y}
              texto={formatoValor(puntos[seleccionado].valor)}
              anchoGrafico={ancho}
            />
          </>
        ) : null}

        {/* Etiquetas del eje X */}
        {labels.map((etiqueta, i) => {
          const x = PADDING_IZQ + (anchoInterno * i) / Math.max(labels.length - 1, 1);
          return (
            <SvgText
              key={`etiqueta-${i}`}
              x={x}
              y={height - 5}
              fontSize={10}
              fill={colors.textTertiary}
              textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
            >
              {etiqueta}
            </SvgText>
          );
        })}

        {/* Zonas táctiles por punto (transparentes) para el tooltip */}
        {puntos.map((punto, i) => {
          const anchoBanda = anchoInterno / Math.max(puntos.length - 1, 1);
          const x = i === 0 ? PADDING_IZQ : punto.x - anchoBanda / 2;
          const w = i === 0 ? anchoBanda / 2 : i === puntos.length - 1 ? anchoBanda / 2 : anchoBanda;
          return (
            <Rect
              key={`toque-${i}`}
              x={x}
              y={0}
              width={w}
              height={height}
              fill="transparent"
              onPress={() => setSeleccionado(seleccionado === i ? null : i)}
            />
          );
        })}
      </Svg>
    </View>
  );
}

/** Burbuja con el valor del punto seleccionado. */
function ValorTooltip({ x, y, texto, anchoGrafico }) {
  const anchoBurbuja = Math.max(texto.length * 7 + 16, 40);
  const xBurbuja = Math.min(Math.max(x - anchoBurbuja / 2, 0), anchoGrafico - anchoBurbuja);
  const yBurbuja = Math.max(y - 28, 0);

  return (
    <>
      <Rect x={xBurbuja} y={yBurbuja} width={anchoBurbuja} height={20} rx={10} fill={colors.textPrimary} />
      <SvgText
        x={x}
        y={yBurbuja + 14}
        fontSize={10}
        fontWeight="700"
        fill={colors.white}
        textAnchor="middle"
      >
        {texto}
      </SvgText>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    width: '100%',
    marginTop: spacing.md,
  },
});

/**
 * Gráfica de barras (consumo semanal): barras redondeadas con degradado,
 * etiquetas en el eje X y tooltip al tocar una barra (sugerido).
 */
import React, { useId, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, spacing } from '../../theme';

const PADDING_IZQ = 8;
const PADDING_DER = 8;
const PADDING_SUP = 26; // Espacio para el tooltip sobre la barra más alta
const PADDING_INF = 22; // Espacio para las etiquetas del eje X

export default function BarChart({
  data = [], // [{ etiqueta, valor }]
  height = 150,
  colorInicio = '#6FAE55', // Color base del degradado (abajo)
  colorFin = '#17643C', // Color del degradado (arriba)
  formatoValor = (v) => String(v),
  style,
}) {
  const [ancho, setAncho] = useState(0);
  const [seleccionada, setSeleccionada] = useState(null); // Índice seleccionado
  const gradienteId = useId().replace(/[^a-zA-Z0-9]/g, '');

  const geometria = useMemo(() => {
    const n = data.length;
    if (!n || ancho === 0) return null;

    const anchoInterno = ancho - PADDING_IZQ - PADDING_DER;
    const altoGrafico = height - PADDING_SUP - PADDING_INF;
    const ranura = anchoInterno / n;
    const anchoBarra = Math.min(26, ranura * 0.55);
    const maxValor = Math.max(...data.map((d) => d.valor), 1);

    return {
      anchoInterno,
      altoGrafico,
      ranura,
      anchoBarra,
      maxValor,
    };
  }, [data, ancho, height]);

  if (!geometria) {
    return <View style={[styles.contenedor, { height }, style]} onLayout={(e) => setAncho(e.nativeEvent.layout.width)} />;
  }

  const { anchoInterno, altoGrafico, ranura, anchoBarra, maxValor } = geometria;
  const lineasGuia = [0, 0.5, 1];

  return (
    <View
      style={[styles.contenedor, { height }, style]}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
    >
      <Svg width={ancho} height={height}>
        <Defs>
          <LinearGradient id={`grad${gradienteId}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colorFin} />
            <Stop offset="1" stopColor={colorInicio} />
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

        {/* Barras */}
        {data.map((dato, i) => {
          const altoBarra = Math.max((dato.valor / maxValor) * altoGrafico, 2);
          const x = PADDING_IZQ + ranura * i + (ranura - anchoBarra) / 2;
          const y = PADDING_SUP + (altoGrafico - altoBarra);
          const activa = seleccionada === i;

          return (
            <Rect
              key={`barra-${i}`}
              x={x}
              y={y}
              width={anchoBarra}
              height={altoBarra}
              rx={Math.min(7, anchoBarra / 2)}
              fill={`url(#grad${gradienteId})`}
              opacity={seleccionada === null || activa ? 1 : 0.35}
            />
          );
        })}

        {/* Tooltip del valor seleccionado */}
        {seleccionada !== null && data[seleccionada] ? (
          <ValorTooltip
            x={PADDING_IZQ + ranura * seleccionada + ranura / 2}
            y={PADDING_SUP + altoGrafico * (1 - data[seleccionada].valor / maxValor)}
            texto={formatoValor(data[seleccionada].valor)}
          />
        ) : null}

        {/* Etiquetas del eje X */}
        {data.map((dato, i) => (
          <SvgText
            key={`etiqueta-${i}`}
            x={PADDING_IZQ + ranura * i + ranura / 2}
            y={height - 6}
            fontSize={10}
            fill={colors.textTertiary}
            textAnchor="middle"
          >
            {dato.etiqueta}
          </SvgText>
        ))}

        {/* Zonas táctiles por barra (transparentes) para el tooltip */}
        {data.map((_, i) => (
          <Rect
            key={`toque-${i}`}
            x={PADDING_IZQ + ranura * i}
            y={0}
            width={ranura}
            height={height}
            fill="transparent"
            onPress={() => setSeleccionada(seleccionada === i ? null : i)}
          />
        ))}
      </Svg>
    </View>
  );
}

/** Burbuja con el valor sobre la barra seleccionada. */
function ValorTooltip({ x, y, texto }) {
  const anchoBurbuja = Math.max(texto.length * 7 + 16, 34);
  const xBurbuja = Math.max(x - anchoBurbuja / 2, 0);
  const yBurbuja = Math.max(y - 26, 0);

  return (
    <>
      <Rect
        x={xBurbuja}
        y={yBurbuja}
        width={anchoBurbuja}
        height={20}
        rx={10}
        fill={colors.textPrimary}
      />
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

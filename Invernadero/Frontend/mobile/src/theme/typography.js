/**
 * Escala tipográfica de la app.
 * Se usa la fuente del sistema con distintos pesos y tamaños,
 * siguiendo las jerarquías de los mockups (títulos, valores grandes, etc.).
 */
export const typography = {
  hero: { fontSize: 20, fontWeight: '700', lineHeight: 26 }, // Título de la tarjeta hero
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 }, // Títulos de pantalla
  section: { fontSize: 16, fontWeight: '700', lineHeight: 22 }, // Títulos de sección
  subtitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  bodyBold: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  captionBold: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: '500', lineHeight: 14 }, // Etiquetas pequeñas (tab bar)
  button: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  value: { fontSize: 26, fontWeight: '700', lineHeight: 32 }, // Valor grande de sensor
  bigValue: { fontSize: 32, fontWeight: '700', lineHeight: 38 }, // Valores grandes (8.4 L, 30 s)
};

/**
 * Paleta de colores de «Invernadero Inteligente».
 * Centraliza todos los colores de la app, extraídos de las descripciones
 * de los mockups (verdes oscuros/claros, cremas, gris verdoso, etc.).
 */
export const colors = {
  // Marca
  primary: '#17643C', // Verde oscuro principal (hero, botones primarios, texto activo)
  primaryDark: '#0E4A2A', // Verde más oscuro (estado pulsado, cabecera de autenticación)
  primaryLight: '#DDEFE3', // Verde claro (fondos de iconos, botones secundarios)
  primarySoft: '#EDF6F0', // Verde muy claro (halos y fondos suaves)

  // Superficies
  background: '#F2F5F0', // Fondo general gris verdoso
  surface: '#FFFFFF', // Tarjetas y superficies blancas
  surfaceMuted: '#E4EAE3', // Fondo gris verdoso de controles (segmentado, stepper)

  // Texto
  textPrimary: '#1C2B21',
  textSecondary: '#66736A',
  textTertiary: '#99A49C',
  onPrimary: '#FFFFFF',

  // Bordes y líneas
  border: '#E3E9E4',
  divider: '#EDF1ED',

  // Estados
  success: '#2F8A57', // Verde «Saludable», «Ideal», «Óptima»
  successBg: '#E2F3E8',
  warning: '#8F6A06', // Ámbar «Atención», «Media», «Alta (humedad)»
  warningBg: '#FFF6D9', // Crema / amarillo muy claro (banners y alertas)
  warningBorder: '#EFD96A',
  danger: '#C0342B', // Rojo «Crítico», «Alta», «Fallido»
  dangerBg: '#FBE7E4', // Rosa claro (errores, botón cerrar sesión)
  info: '#5F6C64', // Gris «Info», «Sin conexión»
  infoBg: '#EDF0ED',

  // Sensores (color de icono / fondo suave)
  soil: '#1D6FD6',
  soilBg: '#E3F0FD', // Suelo: azul claro
  temperature: '#E0640F',
  temperatureBg: '#FFEAD6', // Temperatura: naranja claro
  ambient: '#0F8C77',
  ambientBg: '#D9F2EC', // Ambiente: verde azulado claro
  light: '#B2840A',
  lightBg: '#FCF3CE', // Luminosidad: amarillo claro

  // Varios
  overlay: 'rgba(10, 30, 18, 0.45)', // Fondo oscurecido de los modales
  offlineDot: '#9AA69E', // Punto gris (sin conexión)
  onlineDot: '#31A15F', // Punto verde (en línea)
  white: '#FFFFFF',
  transparent: 'transparent',
};

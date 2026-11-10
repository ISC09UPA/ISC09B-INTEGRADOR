// Paleta tomada de los mockups (Figma).
export const colors = {
  bg: '#F2F2F2',
  bgHome: '#F6F6F6',
  text: '#1A1A1A',
  muted: '#5E5E5E',
  subtle: '#828282',
  placeholder: '#828282',
  border: '#DCDCDC',
  borderSoft: '#E6E6E6',
  primary: '#111111',
  card: '#2E2E2E',
  cardInner: '#3D3D3D',
  white: '#FFFFFF',
  black: '#000000',

  // Botones y superficies grises
  chip: '#E4E4E4',
  surface: '#EDEDED',
  surfaceAlt: '#F7F7F7',
  track: '#E6E6E6',

  // Pantalla de inicio
  homeCard: '#D9D9D9',
  homeTile: '#757575',
  homeTileText: '#DADADA',
  homeButton: '#DADADA',
  homeAvatar: '#1D1B20',

  // Estado del dispensador
  green: '#3C8763',
  greenSoft: '#DEF0E7',
  greenTrack: '#E3EBE7',
  greenText: '#1E322D',

  // Marca (pantallas de acceso)
  brand: '#6750A4',
  brandSoft: '#E8DEF8',
  link: '#00A2FF',
  google: '#EEEEEE',

  // Cámara
  camBg: '#111111',
  camPanel: '#242424',
  camButton: '#2B2B2B',
  camText: '#9A9A9A',

  danger: '#FE2C55',
  warning: '#C98A41',
};

export type ColorName = keyof typeof colors;

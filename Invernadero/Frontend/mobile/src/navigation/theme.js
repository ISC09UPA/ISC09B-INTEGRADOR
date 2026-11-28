/**
 * Tema de React Navigation alineado con el sistema de diseño de la app.
 */
import { DefaultTheme } from '@react-navigation/native';
import { colors } from '../theme';

export const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
};

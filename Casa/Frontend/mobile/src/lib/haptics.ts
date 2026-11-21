import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const activo = Platform.OS !== 'web';

export const tacto = {
  toque: () => {
    if (activo) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  fuerte: () => {
    if (activo) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  exito: () => {
    if (activo) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error: () => {
    if (activo) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};

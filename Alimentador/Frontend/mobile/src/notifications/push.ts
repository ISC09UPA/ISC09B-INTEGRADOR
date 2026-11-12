import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { authApi } from '@/api/endpoints';

let configurado = false;

function configurarHandler() {
  if (configurado || Platform.OS === 'web') return;
  configurado = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function projectId(): string | undefined {
  const desdeEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (desdeEnv) return desdeEnv;
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Pide permiso, obtiene el token de Expo y lo manda a PUT /api/auth/push-token.
 * En web o en simuladores no hace nada. Devuelve el token si se registró.
 */
export async function registrarPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  configurarHandler();

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alertas', {
        name: 'Alertas del alimentador',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const actual = await Notifications.getPermissionsAsync();
    let concedido = actual.granted;
    if (!concedido && actual.canAskAgain) concedido = (await Notifications.requestPermissionsAsync()).granted;
    if (!concedido) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await authApi.pushToken(data);
    return data;
  } catch (e) {
    console.warn('No se pudo registrar el token de notificaciones', e);
    return null;
  }
}

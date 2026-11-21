import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PUERTO = 5107;

/**
 * URL del backend CasaLink. Orden de prioridad:
 * 1. EXPO_PUBLIC_API_URL (archivo .env)
 * 2. Web: el mismo equipo desde el que abriste la app (localhost)
 * 3. Expo Go: la IP de la PC que corre `expo start` (se detecta sola)
 * 4. Valor de respaldo
 * También se puede cambiar desde Ajustes o desde el login ("Servidor").
 */
function urlPorDefecto(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:${PUERTO}`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:${PUERTO}`;
  return `http://192.168.1.100:${PUERTO}`;
}

export const DEFAULT_API_URL: string = process.env.EXPO_PUBLIC_API_URL || urlPorDefecto();

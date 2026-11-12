import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlimentadorProvider } from '@/context/AlimentadorContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Landing from '@/screens/Landing';
import { fontAssets } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Navegacion() {
  const { estado } = useAuth();
  const [fuentes, errorFuentes] = useFonts(fontAssets);
  const listo = (fuentes || !!errorFuentes) && estado !== 'cargando';

  useEffect(() => {
    // La Landing ya es la pantalla de carga; el splash nativo se oculta en cuanto hay algo que pintar.
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  if (!listo) return <Landing />;

  const autenticado = estado === 'autenticado';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Protected guard={!autenticado}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={autenticado}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alimentar" />
        <Stack.Screen name="resultado" />
        <Stack.Screen name="alertas" />
        <Stack.Screen name="ajustes" />
        <Stack.Screen name="identificaciones" />
        <Stack.Screen name="mascota/nueva" />
        <Stack.Screen name="mascota/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AlimentadorProvider>
          <StatusBar style="dark" />
          <Navegacion />
        </AlimentadorProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

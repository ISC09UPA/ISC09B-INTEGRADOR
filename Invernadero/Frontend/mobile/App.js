/**
 * Punto de entrada de «Invernadero Inteligente».
 * Monta el proveedor de estado global, la navegación, el toast global
 * y la barra de estado del sistema.
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigation from './src/navigation';
import { Toast } from './src/components';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigation />
        <Toast />
        <StatusBar style="dark" />
      </AppProvider>
    </SafeAreaProvider>
  );
}

/**
 * Navegador raíz: decide entre el stack de autenticación (Login/Crear cuenta)
 * y las pestañas principales según exista una sesión activa.
 * Mientras se restaura la sesión muestra una pantalla de carga.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { sesion, restaurando } = useApp();

  if (restaurando) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {sesion ? (
        <Stack.Screen name="Principal" component={MainTabs} />
      ) : (
        <Stack.Screen name="Autenticacion" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

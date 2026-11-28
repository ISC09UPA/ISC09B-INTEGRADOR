/**
 * Stack de autenticación: Login y Crear cuenta.
 * Estas pantallas no muestran la barra de navegación inferior.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="CrearCuenta" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

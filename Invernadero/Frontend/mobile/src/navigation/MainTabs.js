/**
 * Pestañas principales de la app: Inicio, Planta, Riego, Historial y Más.
 * «Más» es un stack anidado (pantallas secundarias apiladas sobre la pestaña).
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabBar } from '../components';
import HomeScreen from '../screens/tabs/HomeScreen';
import PlantScreen from '../screens/tabs/PlantScreen';
import WaterScreen from '../screens/tabs/WaterScreen';
import HistoryScreen from '../screens/tabs/HistoryScreen';
import MoreStack from './MoreStack';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Planta" component={PlantScreen} options={{ title: 'Planta' }} />
      <Tab.Screen name="Riego" component={WaterScreen} options={{ title: 'Riego' }} />
      <Tab.Screen name="Historial" component={HistoryScreen} options={{ title: 'Historial' }} />
      {/*
        «Más» es un stack anidado. Con popToTopOnBlur (opción oficial de
        bottom-tabs), al salir de la pestaña el stack vuelve a su raíz
        (el menú), en lugar de quedarse pegado en la última pantalla abierta
        (p. ej. «Plantas y dispositivos»). Si además se toca «Más» estando
        dentro de una pantalla apilada, React Navigation ya regresa al menú.
      */}
      <Tab.Screen
        name="Más"
        component={MoreStack}
        options={{ title: 'Más', popToTopOnBlur: true }}
      />
    </Tab.Navigator>
  );
}

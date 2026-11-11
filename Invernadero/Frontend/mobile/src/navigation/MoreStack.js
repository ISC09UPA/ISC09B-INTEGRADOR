/**
 * Stack de la pestaña «Más»: pantallas secundarias que se apilan
 * sobre el menú (Alertas, Galería, Plantas y dispositivos, etc.).
 * La barra de pestañas permanece visible con «Más» activa.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreScreen from '../screens/tabs/MoreScreen';
import WateringHistoryScreen from '../screens/more/WateringHistoryScreen';
import AlertsScreen from '../screens/more/AlertsScreen';
import GalleryScreen from '../screens/more/GalleryScreen';
import PlantsDevicesScreen from '../screens/more/PlantsDevicesScreen';
import NewPlantScreen from '../screens/more/NewPlantScreen';
import ProfileScreen from '../screens/more/ProfileScreen';
import ProfileEditScreen from '../screens/more/ProfileEditScreen';
import NotificationsScreen from '../screens/more/NotificationsScreen';
import PlantGalleryScreen from '../screens/more/PlantGalleryScreen';
import GuideScreen from '../screens/more/GuideScreen';

const Stack = createNativeStackNavigator();

export default function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MenuInicio" component={MoreScreen} />
      <Stack.Screen name="HistorialRiego" component={WateringHistoryScreen} />
      <Stack.Screen name="Alertas" component={AlertsScreen} />
      <Stack.Screen name="Galeria" component={GalleryScreen} />
      <Stack.Screen name="PlantasDispositivos" component={PlantsDevicesScreen} />
      <Stack.Screen name="NuevaPlanta" component={NewPlantScreen} />
      <Stack.Screen name="Perfil" component={ProfileScreen} />
      <Stack.Screen name="DatosPersonales" component={ProfileEditScreen} />
      <Stack.Screen name="Notificaciones" component={NotificationsScreen} />
      <Stack.Screen name="GaleriaPlanta" component={PlantGalleryScreen} />
      <Stack.Screen name="GuiaSoporte" component={GuideScreen} />
    </Stack.Navigator>
  );
}

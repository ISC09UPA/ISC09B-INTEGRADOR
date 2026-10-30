import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { C } from './src/theme';
import { getProductos } from './src/api';
import { useData, estado } from './src/components';
import Login from './src/screens/Login';
import Inventario from './src/screens/Inventario';
import Estadisticas from './src/screens/Estadisticas';
import Alertas from './src/screens/Alertas';
import Camara from './src/screens/Camara';
import Movimientos from './src/screens/Movimientos';
import Escanear from './src/screens/Escanear';

const Tab = createBottomTabNavigator();
const ICON = {
  Inventario: 'grid-outline', Estadísticas: 'stats-chart-outline', Alertas: 'notifications-outline',
  Cámara: 'videocam-outline', Movimientos: 'swap-vertical-outline', Escanear: 'scan-outline',
};

function Tabs({ user, salir }) {
  const admin = user.rol === 'admin';
  const [ps] = useData(getProductos, 10000);
  const alertas = ps ? ps.filter((p) => estado(p) === 'bajo').length : 0;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: C.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <Pressable onPress={salir} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </Pressable>
        ),
        tabBarActiveTintColor: C.primary,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICON[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Inventario">{() => <Inventario rol={user.rol} />}</Tab.Screen>
      {admin && <Tab.Screen name="Estadísticas" component={Estadisticas} />}
      {admin && <Tab.Screen name="Alertas" component={Alertas} options={{ tabBarBadge: alertas || undefined }} />}
      {admin && <Tab.Screen name="Cámara" component={Camara} />}
      {!admin && <Tab.Screen name="Movimientos">{() => <Movimientos usuario={user.nombre} />}</Tab.Screen>}
      <Tab.Screen name="Escanear" component={Escanear} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  return (
    <>
      <StatusBar style="light" />
      {user ? (
        <NavigationContainer>
          <Tabs user={user} salir={() => setUser(null)} />
        </NavigationContainer>
      ) : (
        <Login onLogin={setUser} />
      )}
    </>
  );
}

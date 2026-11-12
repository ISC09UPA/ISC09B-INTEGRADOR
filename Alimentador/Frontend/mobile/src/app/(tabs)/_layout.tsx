import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="mascotas" options={{ title: 'Mascotas' }} />
      <Tabs.Screen name="historial" options={{ title: 'Estadísticas' }} />
      <Tabs.Screen name="dispensador" options={{ title: 'Dispensador' }} />
      <Tabs.Screen name="camara" options={{ title: 'Cámara' }} />
    </Tabs>
  );
}

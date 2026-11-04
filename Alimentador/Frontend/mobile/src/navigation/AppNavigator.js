import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import PetProfileScreen from '../screens/PetProfileScreen';
import StatsScreen from '../screens/StatsScreen';
import DispenserScreen from '../screens/DispenserScreen';
import CameraScreen from '../screens/CameraScreen';
import ManualFeedScreen from '../screens/ManualFeedScreen';
import ResultScreen from '../screens/ResultScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Mascota" component={PetProfileScreen} />
      <Tab.Screen name="Estadísticas" component={StatsScreen} />
      <Tab.Screen name="Dispensador" component={DispenserScreen} />
      <Tab.Screen name="Cámara" component={CameraScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="AlimentarAhora" component={ManualFeedScreen} />
      <Stack.Screen name="Resultado" component={ResultScreen} />
    </Stack.Navigator>
  );
}
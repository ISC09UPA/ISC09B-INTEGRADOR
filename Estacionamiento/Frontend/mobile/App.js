import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import SlotDetailScreen from './src/screens/SlotDetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import VehiclesScreen from './src/screens/VehiclesScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomTabs from './src/components/BottomTabs';
import { colors } from './src/theme';

const USER_TABS = [
  { id: 'mapa', label: 'Mapa', icon: 'grid' },
  { id: 'historial', label: 'Historial', icon: 'list' },
  { id: 'perfil', label: 'Perfil', icon: 'person' },
];

const ADMIN_TABS = [
  { id: 'mapa', label: 'Mapa', icon: 'grid' },
  { id: 'panel', label: 'Panel', icon: 'stats-chart' },
  { id: 'vehiculos', label: 'Vehículos', icon: 'car' },
  { id: 'escaner', label: 'Escáner', icon: 'camera' },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('mapa');
  const [selectedSlot, setSelectedSlot] = useState(null);

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen
          onLogin={(s) => {
            setSession(s);
            setTab(s.role === 'administrador' ? 'panel' : 'mapa');
          }}
        />
      </>
    );
  }

  const logout = () => {
    setSession(null);
    setTab('mapa');
    setSelectedSlot(null);
  };

  if (session.role === 'administrador') {
    const changeTab = (id) => {
      setTab(id);
      setSelectedSlot(null);
    };

    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        {tab === 'mapa' ? (
          selectedSlot !== null ? (
            <SlotDetailScreen slotId={selectedSlot} onBack={() => setSelectedSlot(null)} />
          ) : (
            <MapScreen name="Administrador" showMyCar={false} onSelectSlot={setSelectedSlot} />
          )
        ) : tab === 'panel' ? (
          <AdminPanelScreen onLogout={logout} />
        ) : tab === 'vehiculos' ? (
          <VehiclesScreen />
        ) : (
          <ScannerScreen />
        )}
        <BottomTabs tabs={ADMIN_TABS} active={tab} onChange={changeTab} />
      </View>
    );
  }

  const userName = session.email ? session.email.split('@')[0] : 'Usuario';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {tab === 'mapa' ? (
        selectedSlot !== null ? (
          <SlotDetailScreen slotId={selectedSlot} onBack={() => setSelectedSlot(null)} />
        ) : (
          <MapScreen name={userName} onSelectSlot={setSelectedSlot} />
        )
      ) : tab === 'historial' ? (
        <HistoryScreen />
      ) : (
        <ProfileScreen
          name={userName}
          email={session.email}
          onLogout={logout}
          onOpenSlot={(id) => {
            setTab('mapa');
            setSelectedSlot(id);
          }}
        />
      )}
      <BottomTabs
        tabs={USER_TABS}
        active={tab}
        onChange={(id) => {
          setTab(id);
          setSelectedSlot(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});

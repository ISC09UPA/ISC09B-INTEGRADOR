import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MapScreen from './src/screens/MapScreen';
import SlotDetailScreen from './src/screens/SlotDetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import VehiclesScreen from './src/screens/VehiclesScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomTabs from './src/components/BottomTabs';
import { guardarToken, borrarToken } from './src/api';
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
  // session: la respuesta del login o registro → { token, expira, usuario: { id, nombre, correo, rol, placas } }
  const [session, setSession] = useState(null);
  const [registrando, setRegistrando] = useState(false);
  const [tab, setTab] = useState('mapa');
  const [selectedSlot, setSelectedSlot] = useState(null); // número de cajón
  const [verAlertas, setVerAlertas] = useState(false);

  const iniciarSesion = (s) => {
    guardarToken(s.token);
    setSession(s);
    setRegistrando(false);
    setTab(s.usuario.rol === 'Administrador' ? 'panel' : 'mapa');
  };

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        {registrando ? (
          <RegisterScreen onRegistrado={iniciarSesion} onVolver={() => setRegistrando(false)} />
        ) : (
          <LoginScreen onLogin={iniciarSesion} onCrearCuenta={() => setRegistrando(true)} />
        )}
      </>
    );
  }

  const logout = () => {
    borrarToken();
    setSession(null);
    setTab('mapa');
    setSelectedSlot(null);
    setVerAlertas(false);
  };

  const usuario = session.usuario;

  if (usuario.rol === 'Administrador') {
    const changeTab = (id) => {
      setTab(id);
      setSelectedSlot(null);
      setVerAlertas(false);
    };

    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        {tab === 'mapa' ? (
          selectedSlot !== null ? (
            <SlotDetailScreen numero={selectedSlot} onBack={() => setSelectedSlot(null)} />
          ) : (
            <MapScreen name="Administrador" showMyCar={false} onSelectSlot={setSelectedSlot} />
          )
        ) : tab === 'panel' ? (
          verAlertas ? (
            <AlertsScreen onBack={() => setVerAlertas(false)} />
          ) : (
            <AdminPanelScreen onLogout={logout} onSeeAlert={() => setVerAlertas(true)} />
          )
        ) : tab === 'vehiculos' ? (
          <VehiclesScreen />
        ) : (
          <ScannerScreen />
        )}
        <BottomTabs tabs={ADMIN_TABS} active={tab} onChange={changeTab} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {tab === 'mapa' ? (
        selectedSlot !== null ? (
          <SlotDetailScreen numero={selectedSlot} onBack={() => setSelectedSlot(null)} />
        ) : (
          <MapScreen name={usuario.nombre} onSelectSlot={setSelectedSlot} />
        )
      ) : tab === 'historial' ? (
        <HistoryScreen />
      ) : (
        <ProfileScreen
          usuario={usuario}
          onLogout={logout}
          onOpenSlot={(numero) => {
            setTab('mapa');
            setSelectedSlot(numero);
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

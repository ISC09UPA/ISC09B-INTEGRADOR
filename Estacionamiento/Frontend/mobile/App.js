import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import { colors } from './src/theme';

export default function App() {
  const [session, setSession] = useState(null);

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLogin={setSession} />
      </>
    );
  }

  // Placeholder: aquí irán las pantallas de usuario / administrador
  return (
    <View style={styles.placeholder}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Hola, {session.role}</Text>
      <Text style={styles.text}>
        Próximamente: {session.role === 'administrador' ? 'Panel' : 'Mapa'}.
      </Text>
      <Pressable onPress={() => setSession(null)}>
        <Text style={styles.link}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  text: { fontSize: 15, color: colors.inkSoft },
  link: { marginTop: 8, fontWeight: '700', color: colors.red },
});

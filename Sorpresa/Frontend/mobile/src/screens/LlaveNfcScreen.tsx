import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Button, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HceKeyModule {
  isNfcEnabled: () => boolean;
  getUser: () => string;
  setUser: (user: string) => void;
}

let HceKey: HceKeyModule | null = null;

if (Platform.OS === 'android') {
  try {
    HceKey = require('../../modules/hce-key').default as HceKeyModule;
  } catch {
    HceKey = null;
  }
}

const C = {
  tinta: '#16302f', gris: '#5f7776', fondo: '#f4f8f8', linea: '#d5e0e0',
  verde: '#0f766e', verdeClaro: '#d9f0ec',
  ok: '#15803d', okClaro: '#dcf5e3', malo: '#c2321f', maloClaro: '#fbe3df',
};

export default function AccesoSensorScreen() {
  const [identificador, setIdentificador] = useState<string>('');
  const [guardado, setGuardado] = useState<string>('');
  const [sensorActivo, setSensorActivo] = useState<boolean | null>(null);

  const revisarSensor = useCallback((): void => {
    if (HceKey) setSensorActivo(HceKey.isNfcEnabled());
  }, []);

  useEffect(() => {
    if (HceKey) {
      const u = HceKey.getUser();
      setIdentificador(u);
      setGuardado(u);
    }
    revisarSensor();
  }, [revisarSensor]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') revisarSensor();
    });
    return () => sub.remove();
  }, [revisarSensor]);

  const activarSensor = (): void => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.NFC_SETTINGS');
    } else {
      Linking.openSettings();
    }
  };

  const guardar = (): void => {
    const limpio = identificador.trim();

    if (!/^[A-Za-z0-9._-]{1,16}$/.test(limpio)) {
      Alert.alert('Identificador no válido', 'Usa de 1 a 16 caracteres, sin espacios ni acentos.');
      return;
    }

    if (HceKey) {
      try {
        HceKey.setUser(limpio);
      } catch (error) {
        Alert.alert('Error', 'Hubo un problema al comunicarse con el sensor físico.');
        return;
      }
    } else {
      console.log('Modo prueba: Simulando guardado', limpio);
    }

    setGuardado(limpio);
    Alert.alert('Listo', 'Identificador guardado: ' + limpio);
  };

  const activo = sensorActivo === true;
  const textoEstado = sensorActivo === null ? 'Verificando...' : activo ? 'Teléfono listo' : 'Sensor apagado';
  const colorEstado = sensorActivo === null ? C.gris : activo ? C.ok : C.malo;
  const fondoEstado = sensorActivo === null ? C.linea : activo ? C.okClaro : C.maloClaro;

  return (
    <SafeAreaView style={styles.pantalla} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.etiqueta}>Consultorio Inteligente</Text>
        <Text style={styles.titulo}>Acceso automático</Text>

        <View style={[styles.tarjeta, { alignItems: 'center', paddingVertical: 24 }]}>
          <View style={[styles.circulo, { backgroundColor: fondoEstado, borderColor: colorEstado }]}>
            <Text style={[styles.textoCirculo, { color: colorEstado }]}>Sensor</Text>
          </View>
          <Text style={[styles.estado, { color: colorEstado, backgroundColor: fondoEstado }]}>
            {textoEstado}
          </Text>

          {activo ? (
            <Text style={styles.centrado}>Acerca tu teléfono (con la pantalla encendida) al sensor de la puerta para entrar.</Text>
          ) : (
            <>
              <Text style={styles.centrado}>Habilita el sensor de tu teléfono para que la puerta pueda registrar tu llegada.</Text>
              <View style={styles.boton}>
                <Button title="Habilitar sensor" color={C.verde} onPress={activarSensor} />
              </View>
              <View style={[styles.boton, styles.botonClaro]}>
                <Button title="Ya lo habilité, verificar" color={C.gris} onPress={revisarSensor} />
              </View>
            </>
          )}
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>Prueba identificador</Text>
          <TextInput
            style={styles.campo}
            value={identificador}
            onChangeText={setIdentificador}
            placeholder="Escribe tu identificador"
            placeholderTextColor={C.gris}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={16}
          />
          <View style={styles.boton}>
            <Button title="Guardar" color={C.verde} onPress={guardar} />
          </View>
          <Text style={styles.etiqueta}>Identificador actual: {guardado || '(ninguno)'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.fondo },
  contenido: { padding: 16, gap: 12 },
  titulo: { fontSize: 26, fontWeight: '700', color: C.tinta },
  subtitulo: { fontSize: 16, fontWeight: '700', color: C.tinta },
  etiqueta: { fontSize: 13, color: C.gris },
  centrado: { textAlign: 'center', color: C.tinta, fontSize: 15 },
  tarjeta: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.linea, borderRadius: 12, padding: 14, gap: 10 },
  circulo: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  textoCirculo: { fontSize: 22, fontWeight: '800' },
  estado: { fontWeight: '700', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 99, overflow: 'hidden' },
  campo: { borderWidth: 1, borderColor: C.linea, borderRadius: 10, padding: 12, fontSize: 16, color: C.tinta },
  boton: { borderRadius: 10, alignSelf: 'stretch', borderWidth: 1, borderColor: C.verde, overflow: 'hidden' },
  botonClaro: { borderColor: C.gris },
});
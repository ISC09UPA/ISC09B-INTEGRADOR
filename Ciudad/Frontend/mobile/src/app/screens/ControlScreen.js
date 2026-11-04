import { useState, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import Boton from '../components/Boton';
import { confirmar } from '../utils/confirmar';
import { getCruce, cambiarModo, forzarPaso, pasoEmergencia } from '../services/cruceService';
import { colores } from '../constants/theme';

const DIRECCIONES = ['Norte–Sur', 'Este–Oeste'];

export default function ControlScreen({ navigation }) {
  const [cruce, setCruce] = useState(null);
  const [error, setError] = useState('');

  async function cargarCruce() {
    try {
      const datos = await getCruce();
      setCruce(datos);
      setError('');
    } catch (err) {
      setError('No se pudo cargar el estado del cruce');
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargarCruce();
    }, [])
  );

  async function alternarModo(valor) {
    try {
      setCruce(await cambiarModo(valor));
      setError('');
    } catch (err) {
      setError('No se pudo cambiar el modo');
    }
  }

  async function elegirDireccion(direccion) {
    try {
      setCruce(await forzarPaso(direccion));
      setError('');
    } catch (err) {
      setError('No se pudo cambiar el semáforo');
    }
  }

  function emergencia() {
    confirmar('¿Dar paso a un vehículo de emergencia?', 'Confirmar', async () => {
      try {
        setCruce(await pasoEmergencia());
        setError('');
      } catch (err) {
        setError('No se pudo activar el paso de emergencia');
      }
    });
  }

  return (
    <Pantalla error={error} onRefrescar={cargarCruce}>
      <Encabezado titulo="Control del semáforo" subtitulo="Av. Central × Reforma" onAtras={() => navigation.goBack()} />

      {cruce && (
        <>
          <Tarjeta style={styles.filaModo}>
            <View style={styles.modoIzq}>
              <View style={styles.icono}>
                <Ionicons name="sparkles-outline" size={20} color={colores.azulClaro} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.h3}>Modo adaptativo</Text>
                <Text style={styles.sub}>Optimiza los ciclos según el flujo</Text>
              </View>
            </View>
            <Switch
              value={cruce.adaptativo}
              onValueChange={alternarModo}
              trackColor={{ false: colores.linea, true: colores.azul }}
            />
          </Tarjeta>

          <View style={styles.tituloSeccion}>
            <View>
              <Text style={styles.h2}>Control manual</Text>
              <Text style={styles.sub}>Fuerza el paso en un sentido</Text>
            </View>
            <Etiqueta texto="Precaución" tono="yellow" />
          </View>

          <Tarjeta>
            <View style={styles.direcciones}>
              {DIRECCIONES.map((d) => {
                const activa = cruce.direccionVerde === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.direccion, activa && styles.direccionActiva]}
                    onPress={() => elegirDireccion(d)}
                  >
                    <Ionicons name="add-circle-outline" size={22} color={colores.texto} />
                    <Text style={styles.direccionNombre}>{d}</Text>
                    <Text style={styles.direccionEstado}>{activa ? 'Verde · 32s' : 'Rojo · 32s'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.ayuda}>El cambio se aplicará al terminar el intervalo de seguridad.</Text>
          </Tarjeta>

          {cruce.peatonalSolicitado && (
            <Tarjeta style={styles.filaModo}>
              <View style={styles.modoIzq}>
                <View style={styles.icono}>
                  <Ionicons name="walk-outline" size={20} color={colores.azulClaro} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.h3}>Cruce peatonal solicitado</Text>
                  <Text style={styles.sub}>{cruce.peatonalDetalle}</Text>
                </View>
              </View>
              <Etiqueta texto="En cola" tono="green" />
            </Tarjeta>
          )}

          <Boton titulo="Paso a vehículo de emergencia" icono="warning-outline" variante="peligro" onPress={emergencia} />
        </>
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  filaModo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  modoIzq: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h2: { fontSize: 17, fontWeight: '700', color: colores.texto },
  h3: { fontSize: 14, fontWeight: '700', color: colores.texto },
  sub: { fontSize: 12, color: colores.gris, marginTop: 2 },
  tituloSeccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginVertical: 10 },
  direcciones: { flexDirection: 'row', gap: 12 },
  direccion: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.tarjeta2,
  },
  direccionActiva: { borderColor: colores.azul, backgroundColor: '#1e3a5f' },
  direccionNombre: { color: colores.texto, fontWeight: '700', fontSize: 13 },
  direccionEstado: { color: colores.gris, fontSize: 11 },
  ayuda: { color: colores.gris, fontSize: 12, marginTop: 12 },
});

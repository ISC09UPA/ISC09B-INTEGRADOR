import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { MAPA_API_URL } from './config';
import { colors, styles } from './styles';

export default function MapaCasa({ apiUrl }) {
  const base = apiUrl ?? MAPA_API_URL;
  const [listo, setListo] = useState(false);
  const [posicion, setPosicion] = useState(null);
  const [eta, setEta] = useState(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (permiso.status !== 'granted') {
          if (activo) setAviso('Activa el permiso de ubicación para ver cuánto tardas en llegar.');
          return;
        }
        const { coords } = await Location.getCurrentPositionAsync({});
        if (!activo) return;
        setPosicion(coords);

        const respuesta = await fetch(
          `${base}/api/mapa/eta?lat=${coords.latitude}&lon=${coords.longitude}`
        );
        if (respuesta.ok && activo) setEta(await respuesta.json());
      } catch (e) {
        if (activo) setAviso('No se pudo obtener tu ubicación.');
      } finally {
        if (activo) setListo(true);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [base]);

  const consulta = posicion ? `?lat=${posicion.latitude}&lon=${posicion.longitude}` : '';

  return (
    <View style={styles.card}>
      {listo ? (
        <Image
          source={{ uri: `${base}/api/mapa/imagen${consulta}` }}
          style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }}
          resizeMode="cover"
        />
      ) : (
        <ActivityIndicator color={colors.green} />
      )}
      {eta ? (
        <>
          <Text style={styles.metric}>
            {eta.minutos ?? '--'} <Text style={styles.metricUnit}>min</Text>
          </Text>
          <Text style={styles.mutedText}>{eta.distanciaKm} km hasta tu casa</Text>
        </>
      ) : null}
      {!!aviso && <Text style={styles.mutedText}>{aviso}</Text>}
    </View>
  );
}
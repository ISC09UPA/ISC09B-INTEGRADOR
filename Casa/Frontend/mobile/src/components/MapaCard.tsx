import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';

import { Card, Label } from './ui';
import { api, tokenActual, urlBase } from '@/lib/api';
import { colors, t } from '@/lib/theme';

type Eta = { minutos: number | null; distanciaKm: number };

/** Azure Maps: mapa de la casa y cuánto tardas en llegar. Solo aparece si el backend tiene Maps configurado. */
export function MapaCard() {
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [eta, setEta] = useState<Eta | null>(null);
  const [aviso, setAviso] = useState('');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (permiso.status === 'granted') {
          const { coords } = await Location.getCurrentPositionAsync({});
          if (!activo) return;
          setPos({ lat: coords.latitude, lon: coords.longitude });
          try {
            setEta(await api.get<Eta>(`/api/mapa/eta?lat=${coords.latitude}&lon=${coords.longitude}`));
          } catch {
            /* sin ruta */
          }
        } else if (activo) {
          setAviso('Activa el permiso de ubicación para ver cuánto tardas en llegar.');
        }
      } catch {
        if (activo) setAviso('No se pudo obtener tu ubicación.');
      } finally {
        if (activo) setListo(true);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const consulta = pos ? `lat=${pos.lat}&lon=${pos.lon}&` : '';
  const uri = `${urlBase()}/api/mapa/imagen?${consulta}access_token=${encodeURIComponent(tokenActual() ?? '')}`;

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {listo ? (
        <Image source={{ uri }} style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.card2 }} resizeMode="cover" />
      ) : (
        <View style={{ aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.lime} />
        </View>
      )}
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Label>Tu casa en el mapa</Label>
          <Text style={[t.mute, { marginTop: 3 }]}>{aviso || (eta ? `${eta.distanciaKm} km hasta tu casa` : 'Calculando ruta…')}</Text>
        </View>
        {eta ? (
          <Text style={t.num}>
            {eta.minutos ?? '--'}
            <Text style={{ fontSize: 15, color: colors.mute }}> min</Text>
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Btn, Burbuja, Card, Label } from './ui';
import { useCasa } from '@/lib/casa';
import { hace, zonaDe } from '@/lib/format';
import { colors, t } from '@/lib/theme';

/** Banner rojo cuando hay una alerta reciente (movimiento o rostro desconocido). */
export function AlertBanner() {
  const { alertaActiva, descartarAlerta } = useCasa();
  const router = useRouter();
  if (!alertaActiva) return null;
  const esMovimiento = /movimiento/i.test(alertaActiva.mensaje);
  const zona = zonaDe(alertaActiva.mensaje);
  return (
    <Card tono="danger" style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Burbuja icono={esMovimiento ? 'pulse' : 'warning'} color={colors.red} bg={colors.redBg} />
        <View style={{ flex: 1 }}>
          <Label style={{ color: colors.red }}>{esMovimiento ? 'Movimiento detectado' : 'Alerta de acceso'}</Label>
          <Text style={[t.h2, { marginTop: 2 }]}>{alertaActiva.mensaje}</Text>
          <Text style={t.mute}>
            {zona ? `${zona} · ` : ''}
            {hace(alertaActiva.hora)}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn title="Ver actividad" variante="danger" pequeno style={{ flex: 1 }} onPress={() => router.navigate('/actividad')} />
        <Btn title="Descartar" variante="ghost" pequeno style={{ flex: 1 }} onPress={descartarAlerta} />
      </View>
    </Card>
  );
}

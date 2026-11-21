import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { HoldButton } from '@/components/HoldButton';
import { LuxMeter } from '@/components/LuxMeter';
import { MapaCard } from '@/components/MapaCard';
import { PlanoCasa } from '@/components/PlanoCasa';
import { Burbuja, Card, Label, Pill, Screen, Seccion, Toggle } from '@/components/ui';
import { useCasa } from '@/lib/casa';
import { useFotos, useServicios } from '@/lib/fotos';
import { hace, saludo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors, t } from '@/lib/theme';

export default function Casa() {
  const { nombre } = useSession();
  const c = useCasa();
  const { estado } = useServicios();
  const { fotos } = useFotos(1, 20000);
  const router = useRouter();
  const panel = c.panel;
  const alarma = !!c.alertaActiva;

  if (!panel) {
    return (
      <Screen>
        <Text style={[t.h1, { marginTop: 40 }]}>Conectando con tu casa…</Text>
        <Text style={[t.mute, { marginTop: 8 }]}>{c.error ?? 'Un momento'}</Text>
      </Screen>
    );
  }

  const luces = Object.entries(panel.luces);
  const encendidas = luces.filter(([, on]) => on).length;
  const temp = Object.entries(panel.clima)[0];
  const ultima = fotos[0];

  return (
    <Screen alarma={alarma}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Label style={{ color: colors.lime }}>{saludo()}</Label>
          <Text style={[t.hero, { marginTop: 2 }]} numberOfLines={1}>
            {nombre || 'Casa'}
          </Text>
        </View>
        <View style={{ gap: 6, alignItems: 'flex-end', paddingTop: 4 }}>
          <Pill texto={c.enVivo ? 'EN VIVO' : 'SIN SEÑAL'} color={c.enVivo ? colors.lime : colors.amber} pulso />
          <Pill texto={panel.raspberry ? 'CASA EN LÍNEA' : 'CASA DESCONECTADA'} color={panel.raspberry ? colors.lime : colors.dim} icono="hardware-chip-outline" />
        </View>
      </View>

      {c.error ? (
        <Card tono="amber" style={{ marginTop: 14, paddingVertical: 12 }}>
          <Text style={{ color: colors.amber, fontWeight: '600' }}>{c.error}</Text>
        </Card>
      ) : null}

      <View style={{ height: 18 }} />
      <AlertBanner />

      <Card tono={panel.seguridad ? 'lime' : 'normal'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Burbuja
            icono={panel.seguridad ? 'shield-checkmark' : 'shield-outline'}
            color={panel.seguridad ? colors.lime : colors.mute}
            bg={panel.seguridad ? colors.limeBg : colors.card2}
            size={54}
          />
          <View style={{ flex: 1 }}>
            <Label>Seguridad</Label>
            <Text style={[t.h2, { marginTop: 2 }]}>{panel.seguridad ? 'Casa asegurada' : 'Vigilancia apagada'}</Text>
            <Text style={t.mute}>{panel.seguridad ? 'Te aviso si detecto movimiento' : 'No recibirás alertas de movimiento'}</Text>
          </View>
          <Toggle valor={panel.seguridad} onCambio={(v) => void c.setSeguridad(v)} />
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <Burbuja
            icono={panel.puerta ? 'lock-open' : 'lock-closed'}
            color={panel.puerta ? colors.amber : colors.lime}
            bg={panel.puerta ? colors.amberBg : colors.limeBg}
            size={54}
          />
          <View style={{ flex: 1 }}>
            <Label>Puerta principal</Label>
            <Text style={[t.h2, { marginTop: 2, color: panel.puerta ? colors.amber : colors.text }]}>{panel.puerta ? 'Abierta' : 'Cerrada'}</Text>
            <Text style={t.mute}>{panel.raspberry ? 'La chapa se libera 5 segundos' : 'La casa no responde ahora mismo'}</Text>
          </View>
        </View>
        <HoldButton titulo="MANTÉN PARA ABRIR" tituloListo="ABRIENDO…" deshabilitado={panel.puerta} onCompleto={() => void c.abrirPuerta()} />
      </Card>

      <Seccion derecha={<Text style={t.mono}>{encendidas}/{luces.length} encendidas</Text>}>Plano</Seccion>
      <Card style={{ padding: 14 }}>
        <PlanoCasa luces={panel.luces} puertaAbierta={panel.puerta} alarma={alarma} onToggle={(n, on) => void c.setLuz(n, on)} />
      </Card>

      <Seccion>Ambiente</Seccion>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1.4 }}>
          <Label>Luz ambiente</Label>
          <LuxMeter lux={panel.lux} />
        </Card>
        {temp ? (
          <Card style={{ flex: 1 }}>
            <Label>{temp[0]}</Label>
            <Text style={[t.num, { marginTop: 14 }]}>{temp[1].temp.toFixed(1)}°</Text>
            <Text style={t.mute}>{Math.round(temp[1].hum)}% humedad</Text>
          </Card>
        ) : null}
      </View>

      {ultima ? (
        <>
          <Seccion>Última captura</Seccion>
          <Pressable onPress={() => router.navigate('/actividad')}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <Image source={{ uri: ultima.url }} style={{ width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.card2 }} resizeMode="cover" />
              <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Burbuja
                  icono={ultima.resultado === 'autorizado' ? 'checkmark' : 'alert'}
                  color={ultima.resultado === 'autorizado' ? colors.lime : colors.red}
                  bg={ultima.resultado === 'autorizado' ? colors.limeBg : colors.redBg}
                  size={38}
                />
                <View style={{ flex: 1 }}>
                  <Text style={t.body}>{ultima.resultado === 'autorizado' ? ultima.etiqueta : 'Rostro no reconocido'}</Text>
                  <Text style={t.mute}>
                    {ultima.zona} · {hace(ultima.hora)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.dim} />
              </View>
            </Card>
          </Pressable>
        </>
      ) : null}

      {estado?.mapas ? (
        <>
          <Seccion>Camino a casa</Seccion>
          <MapaCard />
        </>
      ) : null}
    </Screen>
  );
}

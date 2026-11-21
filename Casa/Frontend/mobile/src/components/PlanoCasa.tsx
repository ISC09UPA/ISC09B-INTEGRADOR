import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { IconName, Pulso } from './ui';
import { tacto } from '@/lib/haptics';
import { colors } from '@/lib/theme';

type Pct = `${number}%`;
type Hab = { left: Pct; top: Pct; width: Pct; height: Pct; icono: IconName };

const HABITACIONES: Record<string, Hab> = {
  Sala: { left: '0%', top: '0%', width: '58%', height: '52%', icono: 'tv-outline' },
  Cocina: { left: '60%', top: '0%', width: '40%', height: '52%', icono: 'restaurant-outline' },
  'Recámara 1': { left: '0%', top: '54%', width: '49%', height: '46%', icono: 'bed-outline' },
  'Recámara 2': { left: '51%', top: '54%', width: '49%', height: '46%', icono: 'bed-outline' },
};

/** Plano de la casa: cada cuarto es una luz que se enciende con un toque. */
export function PlanoCasa({
  luces,
  puertaAbierta,
  alarma,
  onToggle,
}: {
  luces: Record<string, boolean>;
  puertaAbierta: boolean;
  alarma: boolean;
  onToggle: (nombre: string, encendida: boolean) => void;
}) {
  const extras = Object.keys(luces).filter((n) => !HABITACIONES[n]);
  return (
    <View>
      <View style={{ height: 250 }}>
        {Object.entries(HABITACIONES).map(([nombre, h]) => {
          if (!(nombre in luces)) return null;
          const on = luces[nombre];
          return (
            <Pressable
              key={nombre}
              accessibilityRole="switch"
              accessibilityLabel={`Luz de ${nombre}`}
              accessibilityState={{ checked: on }}
              onPress={() => {
                tacto.toque();
                onToggle(nombre, !on);
              }}
              style={({ pressed }) => ({
                position: 'absolute',
                left: h.left,
                top: h.top,
                width: h.width,
                height: h.height,
                borderRadius: 20,
                borderWidth: 1,
                padding: 12,
                justifyContent: 'space-between',
                backgroundColor: on ? colors.warmBg : '#0D1012',
                borderColor: on ? colors.warm : colors.line,
                boxShadow: on ? '0 0 30px rgba(255,200,87,0.30)' : undefined,
                transform: [{ scale: pressed ? 0.975 : 1 }],
              })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Ionicons name={h.icono} size={18} color={on ? colors.warm : colors.dim} />
                <Ionicons name={on ? 'bulb' : 'bulb-outline'} size={20} color={on ? colors.warm : colors.dim} />
              </View>
              <View>
                <Text style={{ color: on ? colors.text : colors.mute, fontSize: 14, fontWeight: '800' }}>{nombre}</Text>
                <Text style={{ color: on ? colors.warm : colors.dim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4 }}>
                  {on ? 'ENCENDIDA' : 'APAGADA'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {extras.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {extras.map((n) => (
            <Pressable
              key={n}
              onPress={() => onToggle(n, !luces[n])}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 99,
                borderWidth: 1,
                borderColor: luces[n] ? colors.warm : colors.line,
                backgroundColor: luces[n] ? colors.warmBg : 'transparent',
              }}
            >
              <Text style={{ color: luces[n] ? colors.warm : colors.mute, fontWeight: '700' }}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View
        style={{
          marginTop: 10,
          height: 40,
          borderRadius: 14,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: alarma ? colors.redLine : puertaAbierta ? colors.amber : colors.line,
          backgroundColor: alarma ? colors.redBg : puertaAbierta ? colors.amberBg : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {alarma ? <Pulso color={colors.red} size={6} /> : null}
        <Ionicons name={puertaAbierta ? 'lock-open-outline' : 'lock-closed-outline'} size={15} color={alarma ? colors.red : puertaAbierta ? colors.amber : colors.mute} />
        <Text style={{ color: alarma ? colors.red : puertaAbierta ? colors.amber : colors.mute, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 }}>
          ENTRADA · {alarma ? 'ALERTA' : puertaAbierta ? 'ABIERTA' : 'CERRADA'}
        </Text>
      </View>
    </View>
  );
}

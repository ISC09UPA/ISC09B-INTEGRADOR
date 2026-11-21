import { Text, View } from 'react-native';

import { colors, t } from '@/lib/theme';

/** Medidor de luz ambiente tipo ecualizador. */
export function LuxMeter({ lux }: { lux: number }) {
  const barras = 22;
  const nivel = Math.min(1, Math.max(0, lux / 400));
  const activas = Math.round(nivel * barras);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 34, marginTop: 10 }}>
        {Array.from({ length: barras }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 8 + (i / barras) * 26,
              borderRadius: 3,
              backgroundColor: i < activas ? (i > barras * 0.75 ? colors.amber : colors.lime) : colors.card2,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
        <Text style={t.num}>{Math.round(lux)}</Text>
        <Text style={t.mute}>lx · {lux < 30 ? 'oscuro' : lux < 120 ? 'tenue' : lux < 300 ? 'claro' : 'muy claro'}</Text>
      </View>
    </View>
  );
}

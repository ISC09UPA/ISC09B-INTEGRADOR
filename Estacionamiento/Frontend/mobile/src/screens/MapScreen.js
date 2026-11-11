import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ParkingSlot from '../components/ParkingSlot';
import { SLOTS, MY_PARKING, GATE_CLOSED } from '../data/mock';
import { colors, radius } from '../theme';

export default function MapScreen({ name = 'Usuario', onSelectSlot, showMyCar = true }) {
  const total = SLOTS.length;
  const free = SLOTS.filter((s) => s.status === 'libre').length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hola, {name}</Text>
          <Text style={styles.title}>Estacionamiento</Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={20} color={colors.green900} />
        </View>
      </View>

      {/* Lugares libres */}
      <View style={styles.freeCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.freeLabel}>Lugares libres ahora</Text>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>En vivo</Text>
          </View>
        </View>
        <Text style={styles.freeNumber}>
          {free} <Text style={styles.freeOf}>de {total} cajones</Text>
        </Text>
        <View style={styles.bars}>
          {SLOTS.map((s) => (
            <View
              key={s.id}
              style={[styles.bar, s.status === 'libre' && styles.barFree]}
            />
          ))}
        </View>
      </View>

      {/* Mapa */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Mapa de cajones</Text>
          <Text style={styles.hint}>Toca un cajón</Text>
        </View>

        <View style={styles.slots}>
          {SLOTS.map((s) => (
            <ParkingSlot key={s.id} id={s.id} status={s.status} onPress={onSelectSlot} />
          ))}
        </View>

        <View style={styles.lane}>
          <Text style={styles.laneText}>CARRIL ENTRADA / SALIDA</Text>
          <View style={styles.gate}>
            <Ionicons name="remove-outline" size={16} color={colors.red} />
            <Text style={styles.gateText}>
              {GATE_CLOSED ? 'Pluma cerrada' : 'Pluma abierta'}
            </Text>
          </View>
        </View>

        <View style={styles.legend}>
          <LegendItem color={colors.surface} border={colors.green700} label="Libre" />
          <LegendItem color={colors.green900} border={colors.green900} label="Ocupado" />
          <LegendItem color={colors.green700} border={colors.green900} label="Tu auto" />
        </View>
      </View>

      {/* Tu auto (solo rol usuario) */}
      {showMyCar && (
        <Pressable style={styles.myCar} onPress={() => onSelectSlot?.(MY_PARKING.slot)}>
          <View style={styles.myCarIcon}>
            <Ionicons name="time-outline" size={18} color={colors.green900} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.myCarTitle}>Tu auto está en el cajón {MY_PARKING.slot}</Text>
            <Text style={styles.myCarSub}>
              Entraste a las {MY_PARKING.entryTime} · {MY_PARKING.elapsed}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </Pressable>
      )}
    </ScrollView>
  );
}

function LegendItem({ color, border, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, { backgroundColor: color, borderColor: border }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { fontSize: 13, color: colors.inkSoft },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green700,
    alignItems: 'center',
    justifyContent: 'center',
  },

  freeCard: {
    backgroundColor: colors.green900,
    borderRadius: radius.lg,
    padding: 18,
    gap: 6,
  },
  freeLabel: { fontSize: 12, color: colors.green100 },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green700 },
  liveText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  freeNumber: { fontSize: 40, fontWeight: '800', color: colors.green700 },
  freeOf: { fontSize: 14, fontWeight: '600', color: '#fff' },
  bars: { flexDirection: 'row', gap: 6, marginTop: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  barFree: { backgroundColor: colors.green700 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  hint: { fontSize: 11, color: colors.inkSoft },
  slots: { flexDirection: 'row', gap: 10 },

  lane: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.green50,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  laneText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: colors.inkSoft },
  gate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gateText: { fontSize: 11, fontWeight: '700', color: colors.red },

  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: { width: 12, height: 12, borderRadius: 3, borderWidth: 2 },
  legendText: { fontSize: 11, color: colors.inkSoft },

  myCar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  myCarIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myCarTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  myCarSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
});

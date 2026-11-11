import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_STATS, HOURLY, SLOT_USAGE, DENIED_ALERT } from '../data/admin';
import { colors, radius } from '../theme';

const CHART_HEIGHT = 100;

export default function AdminPanelScreen({ onLogout, onSeeAlert }) {
  const maxHour = Math.max(...HOURLY.map((h) => h.value));
  const maxUses = Math.max(...SLOT_USAGE.map((s) => s.uses));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.role}>ADMINISTRADOR</Text>
          <Text style={styles.title}>Panel</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.rangeBtn}>
            <Text style={styles.rangeText}>Hoy</Text>
            <Ionicons name="caret-down" size={12} color={colors.ink} />
          </View>
          <Pressable style={styles.iconBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.red} />
          </Pressable>
        </View>
      </View>

      {/* Tarjetas */}
      <View style={styles.grid}>
        <StatCard
          accent
          label="Ocupación ahora"
          value={`${ADMIN_STATS.occupied} / ${ADMIN_STATS.total}`}
        />
        <StatCard label="Entradas hoy" value={ADMIN_STATS.entriesToday} />
      </View>
      <View style={styles.grid}>
        <StatCard label="Estancia promedio" value={ADMIN_STATS.avgStay} />
        <StatCard label="Cajón más usado" value={ADMIN_STATS.topSlot} />
      </View>

      {/* Ocupación por hora */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Ocupación por hora</Text>
          <Text style={styles.source}>Azure Monitor</Text>
        </View>
        <View style={styles.chart}>
          {HOURLY.map((h) => {
            const peak = h.value === maxHour;
            return (
              <View key={h.hour} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: (h.value / maxHour) * CHART_HEIGHT },
                      peak && styles.barPeak,
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{h.hour}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Uso por cajón */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Uso por cajón</Text>
        {SLOT_USAGE.map((s) => (
          <View key={s.slot} style={styles.usageRow}>
            <Text style={styles.usageSlot}>{s.slot}</Text>
            <View style={styles.usageTrack}>
              <View style={[styles.usageFill, { width: `${(s.uses / maxUses) * 100}%` }]} />
            </View>
            <Text style={styles.usageCount}>{s.uses} usos</Text>
          </View>
        ))}
      </View>

      {/* Alerta */}
      <View style={styles.alert}>
        <Ionicons name="warning-outline" size={20} color="#8A5A00" />
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>Entrada negada · {DENIED_ALERT.time}</Text>
          <Text style={styles.alertText}>{DENIED_ALERT.reason}</Text>
        </View>
        <Pressable onPress={onSeeAlert}>
          <Text style={styles.alertLink}>Ver</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <View style={[styles.stat, accent && styles.statAccent]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  role: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.red },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  statAccent: { backgroundColor: colors.green700, borderColor: colors.green700 },
  statLabel: { fontSize: 12, fontWeight: '600', color: colors.green900 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.green900 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  source: { fontSize: 11, fontWeight: '600', color: colors.inkSoft },

  chart: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { height: CHART_HEIGHT, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 5, backgroundColor: colors.green300 },
  barPeak: { backgroundColor: colors.green900 },
  barLabel: { fontSize: 11, color: colors.inkSoft },

  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usageSlot: { width: 24, fontSize: 13, fontWeight: '800', color: colors.ink },
  usageTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green50,
    overflow: 'hidden',
  },
  usageFill: { height: '100%', borderRadius: 4, backgroundColor: colors.green900 },
  usageCount: { width: 56, textAlign: 'right', fontSize: 12, color: colors.inkSoft },

  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF4D6',
    borderWidth: 1,
    borderColor: colors.green300,
    borderRadius: radius.lg,
    padding: 14,
  },
  alertTitle: { fontSize: 14, fontWeight: '800', color: '#5C3D00' },
  alertText: { fontSize: 13, color: '#5C3D00', marginTop: 2 },
  alertLink: { fontSize: 14, fontWeight: '800', color: colors.ink },
});
